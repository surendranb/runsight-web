// Data Storage Engine - Handles database operations with transaction safety

import { supabaseAdmin, handleDatabaseError, withRetry, logDatabaseOperation, batchOperation } from './database';
import { EnrichedActivity } from '../types/sync';
import { validateEnrichedActivity } from './validation';
import { transformForDatabase } from './transformers';
import { DatabaseError, ValidationError, classifyError, ErrorCollector } from './errors';

export interface StorageResult {
  results: {
    saved: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  failedActivities: Array<{
    strava_id: number;
    error: string;
    activity: Partial<EnrichedActivity>;
  }>;
}

export interface StorageOptions {
  batchSize?: number;
  maxRetries?: number;
  validateData?: boolean;
  upsertMode?: boolean; // If true, update existing records instead of skipping
  onProgress?: (processed: number, total: number) => void;
}

export class DataStorer {
  private readonly options: Required<Omit<StorageOptions, 'onProgress'>> & Pick<StorageOptions, 'onProgress'>;

  constructor(options: StorageOptions = {}) {
    this.options = {
      batchSize: options.batchSize || 50,
      maxRetries: options.maxRetries || 3,
      validateData: options.validateData !== false,
      upsertMode: options.upsertMode !== false,
      onProgress: options.onProgress
    };
  }

  // Store a single activity with proper error handling
  async storeActivity(
    activity: Partial<EnrichedActivity>,
    userId: string,
    syncSessionId?: string
  ): Promise<{ saved: boolean; updated: boolean; error?: string; activityId?: string }> {
    const startTime = Date.now();
    
    try {
      // Ensure user_id is set
      const activityToStore = {
        ...activity,
        user_id: userId,
        sync_session_id: syncSessionId
      };

      // Validate data if enabled
      if (this.options.validateData) {
        validateEnrichedActivity(activityToStore);
      }

      // Transform for database storage
      const dbActivity = transformForDatabase(activityToStore);

      // Check if activity already exists
      const { data: existingActivity, error: fetchError } = await supabaseAdmin
        .from('runs')
        .select('id, strava_id, updated_at')
        .eq('user_id', userId)
        .eq('strava_id', dbActivity.strava_id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw handleDatabaseError(fetchError, 'storeActivity:checkExisting');
      }

      let result: { saved: boolean; updated: boolean; activityId?: string };

      if (existingActivity) {
        if (this.options.upsertMode) {
          // Update existing activity
          const { data: updatedActivity, error: updateError } = await supabaseAdmin
            .from('runs')
            .update({
              ...dbActivity,
              id: existingActivity.id, // Keep existing ID
              created_at: undefined, // Don't update created_at
              updated_at: new Date().toISOString()
            })
            .eq('id', existingActivity.id)
            .select('id')
            .single();

          if (updateError) {
            throw handleDatabaseError(updateError, 'storeActivity:update');
          }

          result = { saved: false, updated: true, activityId: updatedActivity.id };
          console.log(`[DataStorer] Updated existing activity ${dbActivity.strava_id} (ID: ${existingActivity.id})`);
        } else {
          // Skip existing activity
          result = { saved: false, updated: false, activityId: existingActivity.id };
          console.log(`[DataStorer] Skipped existing activity ${dbActivity.strava_id} (ID: ${existingActivity.id})`);
        }
      } else {
        // Insert new activity
        const { data: newActivity, error: insertError } = await supabaseAdmin
          .from('runs')
          .insert(dbActivity)
          .select('id')
          .single();

        if (insertError) {
          // Handle unique constraint violations gracefully
          if (insertError.code === '23505') {
            console.warn(`[DataStorer] Duplicate activity detected during insert: ${dbActivity.strava_id}`);
            result = { saved: false, updated: false };
          } else {
            throw handleDatabaseError(insertError, 'storeActivity:insert');
          }
        } else {
          result = { saved: true, updated: false, activityId: newActivity.id };
          console.log(`[DataStorer] Saved new activity ${dbActivity.strava_id} (ID: ${newActivity.id})`);
        }
      }

      const duration = Date.now() - startTime;
      logDatabaseOperation('storeActivity', duration, 1);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      logDatabaseOperation('storeActivity', duration, 0, error as Error);
      
      const errorMessage = (error as Error).message;
      console.error(`[DataStorer] Failed to store activity ${activity.strava_id}:`, errorMessage);
      
      return { 
        saved: false, 
        updated: false, 
        error: errorMessage 
      };
    }
  }

  // Store multiple activities in batches with transaction-like behavior
  async storeActivities(
    activities: Partial<EnrichedActivity>[],
    userId: string,
    syncSessionId?: string
  ): Promise<StorageResult> {
    const startTime = Date.now();
    const errorCollector = new ErrorCollector();
    const failedActivities: StorageResult['failedActivities'] = [];
    
    let saved = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    console.log(`[DataStorer] Starting batch storage of ${activities.length} activities`);

    try {
      // Process activities in batches
      const batches = [];
      for (let i = 0; i < activities.length; i += this.options.batchSize) {
        batches.push(activities.slice(i, i + this.options.batchSize));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`[DataStorer] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} activities)`);

        // Process each activity in the batch
        const batchPromises = batch.map(async (activity) => {
          return await withRetry(
            () => this.storeActivity(activity, userId, syncSessionId),
            'storing',
            { maxRetries: this.options.maxRetries }
          );
        });

        const batchResults = await Promise.allSettled(batchPromises);

        // Process batch results
        for (let i = 0; i < batchResults.length; i++) {
          const result = batchResults[i];
          const activity = batch[i];

          if (result.status === 'fulfilled') {
            const storeResult = result.value;
            
            if (storeResult.error) {
              failed++;
              failedActivities.push({
                strava_id: activity.strava_id || 0,
                error: storeResult.error,
                activity
              });
            } else if (storeResult.saved) {
              saved++;
            } else if (storeResult.updated) {
              updated++;
            } else {
              skipped++;
            }
          } else {
            failed++;
            const error = result.reason;
            errorCollector.addFromCatch(error, 'storing');
            
            failedActivities.push({
              strava_id: activity.strava_id || 0,
              error: error.message || 'Unknown error',
              activity
            });
          }
        }

        // Report progress
        if (this.options.onProgress) {
          const processed = (batchIndex + 1) * this.options.batchSize;
          this.options.onProgress(Math.min(processed, activities.length), activities.length);
        }

        // Small delay between batches to avoid overwhelming the database
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const duration = Date.now() - startTime;
      const totalProcessed = saved + updated + skipped + failed;
      logDatabaseOperation('storeActivities', duration, totalProcessed);

      console.log(`[DataStorer] Batch storage completed: ${saved} saved, ${updated} updated, ${skipped} skipped, ${failed} failed`);

      return {
        results: { saved, updated, skipped, failed },
        failedActivities
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logDatabaseOperation('storeActivities', duration, 0, error as Error);
      throw classifyError(error, 'storing');
    }
  }

  // Upsert activities (insert or update based on existence)
  async upsertActivities(
    activities: Partial<EnrichedActivity>[],
    userId: string,
    syncSessionId?: string
  ): Promise<StorageResult> {
    // Create a new instance with upsert mode enabled
    const upsertStorer = new DataStorer({
      ...this.options,
      upsertMode: true
    });

    return await upsertStorer.storeActivities(activities, userId, syncSessionId);
  }

  // Delete activities by Strava IDs
  async deleteActivities(
    stravaIds: number[],
    userId: string
  ): Promise<{ deleted: number; errors: string[] }> {
    const startTime = Date.now();
    const errors: string[] = [];
    let deleted = 0;

    console.log(`[DataStorer] Deleting ${stravaIds.length} activities for user ${userId}`);

    try {
      // Process deletions in batches
      const batches = [];
      for (let i = 0; i < stravaIds.length; i += this.options.batchSize) {
        batches.push(stravaIds.slice(i, i + this.options.batchSize));
      }

      for (const batch of batches) {
        const { data, error } = await supabaseAdmin
          .from('runs')
          .delete()
          .eq('user_id', userId)
          .in('strava_id', batch)
          .select('id');

        if (error) {
          const errorMsg = handleDatabaseError(error, 'deleteActivities').message;
          errors.push(errorMsg);
          console.error(`[DataStorer] Failed to delete batch:`, errorMsg);
        } else {
          const batchDeleted = data?.length || 0;
          deleted += batchDeleted;
          console.log(`[DataStorer] Deleted ${batchDeleted} activities from batch`);
        }
      }

      const duration = Date.now() - startTime;
      logDatabaseOperation('deleteActivities', duration, deleted);

      return { deleted, errors };

    } catch (error) {
      const duration = Date.now() - startTime;
      logDatabaseOperation('deleteActivities', duration, 0, error as Error);
      throw classifyError(error, 'storing');
    }
  }

  // Get activity by Strava ID
  async getActivity(stravaId: number, userId: string): Promise<EnrichedActivity | null> {
    const startTime = Date.now();

    try {
      const { data, error } = await supabaseAdmin
        .from('runs')
        .select('*')
        .eq('user_id', userId)
        .eq('strava_id', stravaId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw handleDatabaseError(error, 'getActivity');
      }

      const duration = Date.now() - startTime;
      logDatabaseOperation('getActivity', duration, data ? 1 : 0);

      return data as EnrichedActivity | null;

    } catch (error) {
      const duration = Date.now() - startTime;
      logDatabaseOperation('getActivity', duration, 0, error as Error);
      throw classifyError(error, 'fetching');
    }
  }

  // Get activities for a user with optional filtering
  async getActivities(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
      syncSessionId?: string;
    } = {}
  ): Promise<{ activities: EnrichedActivity[]; total: number }> {
    const startTime = Date.now();

    try {
      let query = supabaseAdmin
        .from('runs')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('start_date_utc', { ascending: false });

      // Apply filters
      if (options.startDate) {
        query = query.gte('start_date_utc', options.startDate);
      }
      if (options.endDate) {
        query = query.lte('start_date_utc', options.endDate);
      }
      if (options.syncSessionId) {
        query = query.eq('sync_session_id', options.syncSessionId);
      }

      // Apply pagination
      if (options.limit) {
        const offset = options.offset || 0;
        query = query.range(offset, offset + options.limit - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        throw handleDatabaseError(error, 'getActivities');
      }

      const duration = Date.now() - startTime;
      logDatabaseOperation('getActivities', duration, data?.length || 0);

      return {
        activities: (data || []) as EnrichedActivity[],
        total: count || 0
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logDatabaseOperation('getActivities', duration, 0, error as Error);
      throw classifyError(error, 'fetching');
    }
  }

  // Get storage statistics for a user
  async getStorageStatistics(userId: string): Promise<{
    totalActivities: number;
    weatherEnriched: number;
    geocoded: number;
    dateRange: { earliest?: string; latest?: string };
    storageUsed: number; // Estimated in bytes
  }> {
    const startTime = Date.now();

    try {
      // Get basic counts and date range
      const { data, error } = await supabaseAdmin
        .from('runs')
        .select('start_date_utc, enrichment_status')
        .eq('user_id', userId)
        .order('start_date_utc', { ascending: true });

      if (error) {
        throw handleDatabaseError(error, 'getStorageStatistics');
      }

      const activities = data || [];
      let weatherEnriched = 0;
      let geocoded = 0;

      // Count enriched activities
      for (const activity of activities) {
        const status = activity.enrichment_status as any;
        if (status?.weather) weatherEnriched++;
        if (status?.geocoding) geocoded++;
      }

      const stats = {
        totalActivities: activities.length,
        weatherEnriched,
        geocoded,
        dateRange: {
          earliest: activities.length > 0 ? activities[0].start_date_utc : undefined,
          latest: activities.length > 0 ? activities[activities.length - 1].start_date_utc : undefined
        },
        storageUsed: activities.length * 2048 // Rough estimate: 2KB per activity
      };

      const duration = Date.now() - startTime;
      logDatabaseOperation('getStorageStatistics', duration, activities.length);

      return stats;

    } catch (error) {
      const duration = Date.now() - startTime;
      logDatabaseOperation('getStorageStatistics', duration, 0, error as Error);
      throw classifyError(error, 'fetching');
    }
  }

  // Validate data integrity for stored activities
  async validateDataIntegrity(
    userId: string,
    sampleSize: number = 100
  ): Promise<{
    valid: number;
    invalid: number;
    errors: Array<{ activityId: string; error: string }>;
  }> {
    const startTime = Date.now();
    const errors: Array<{ activityId: string; error: string }> = [];
    let valid = 0;
    let invalid = 0;

    try {
      // Get a sample of activities
      const { data, error } = await supabaseAdmin
        .from('runs')
        .select('*')
        .eq('user_id', userId)
        .limit(sampleSize);

      if (error) {
        throw handleDatabaseError(error, 'validateDataIntegrity');
      }

      const activities = data || [];

      // Validate each activity
      for (const activity of activities) {
        try {
          validateEnrichedActivity(activity);
          valid++;
        } catch (validationError) {
          invalid++;
          errors.push({
            activityId: activity.id,
            error: (validationError as Error).message
          });
        }
      }

      const duration = Date.now() - startTime;
      logDatabaseOperation('validateDataIntegrity', duration, activities.length);

      console.log(`[DataStorer] Data integrity check: ${valid} valid, ${invalid} invalid out of ${activities.length} activities`);

      return { valid, invalid, errors };

    } catch (error) {
      const duration = Date.now() - startTime;
      logDatabaseOperation('validateDataIntegrity', duration, 0, error as Error);
      throw classifyError(error, 'fetching');
    }
  }

  // Clean up old activities (for data retention policies)
  async cleanupOldActivities(
    userId: string,
    cutoffDate: string
  ): Promise<{ deleted: number }> {
    const startTime = Date.now();

    try {
      const { data, error } = await supabaseAdmin
        .from('runs')
        .delete()
        .eq('user_id', userId)
        .lt('start_date_utc', cutoffDate)
        .select('id');

      if (error) {
        throw handleDatabaseError(error, 'cleanupOldActivities');
      }

      const deleted = data?.length || 0;
      const duration = Date.now() - startTime;
      logDatabaseOperation('cleanupOldActivities', duration, deleted);

      console.log(`[DataStorer] Cleaned up ${deleted} activities older than ${cutoffDate}`);

      return { deleted };

    } catch (error) {
      const duration = Date.now() - startTime;
      logDatabaseOperation('cleanupOldActivities', duration, 0, error as Error);
      throw classifyError(error, 'storing');
    }
  }
}

// Export singleton instance
export const dataStorer = new DataStorer();