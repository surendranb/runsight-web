// Sync Orchestrator - The central coordinator that manages the entire sync lifecycle

import { syncStateManager } from './sync-state-manager';
import { stravaClient } from './strava-client';
import { weatherEnricher } from './weather-enricher';
import { dataStorer } from './data-storer';
import { transformStravaToEnriched, calculateDerivedMetrics } from './transformers';
import { 
  SyncSession, 
  SyncRequest, 
  SyncResponse, 
  SyncResults, 
  EnrichedActivity,
  PaginationParams 
} from '../types/sync';
import { 
  SyncError, 
  classifyError, 
  ErrorCollector, 
  withRetry 
} from './errors';

export interface SyncOrchestrationOptions {
  batchSize?: number;
  maxRetries?: number;
  skipWeatherEnrichment?: boolean;
  enableProgressUpdates?: boolean;
  maxActivitiesPerSync?: number;
}

export class SyncOrchestrator {
  private readonly options: Required<SyncOrchestrationOptions>;

  constructor(options: SyncOrchestrationOptions = {}) {
    this.options = {
      batchSize: options.batchSize || 50,
      maxRetries: options.maxRetries || 3,
      skipWeatherEnrichment: options.skipWeatherEnrichment || false,
      enableProgressUpdates: options.enableProgressUpdates !== false,
      maxActivitiesPerSync: options.maxActivitiesPerSync || 1000
    };
  }

  // Main sync orchestration method
  async orchestrateSync(request: SyncRequest): Promise<SyncResponse> {
    const { userId, timeRange, options = {} } = request;
    
    console.log(`[SyncOrchestrator] Starting sync for user ${userId}`);
    console.log(`[SyncOrchestrator] Time range:`, timeRange);
    console.log(`[SyncOrchestrator] Options:`, options);

    // Check if user can start a new sync
    const canStart = await syncStateManager.canStartNewSync(userId);
    if (!canStart.canStart) {
      throw new SyncError(
        canStart.reason || 'Cannot start new sync',
        'SYNC_ALREADY_ACTIVE',
        'unknown_error',
        'fetching',
        false,
        { userId }
      );
    }

    // Create sync session
    const syncSession = await syncStateManager.createSyncSession(
      userId,
      timeRange ? 'date_range' : 'full',
      timeRange?.after ? new Date(timeRange.after * 1000).toISOString() : undefined,
      timeRange?.before ? new Date(timeRange.before * 1000).toISOString() : undefined
    );

    console.log(`[SyncOrchestrator] Created sync session: ${syncSession.id}`);

    try {
      // Execute the sync phases
      const results = await this.executeSyncPhases(syncSession, {
        ...this.options,
        ...options
      });

      // Mark session as completed
      await syncStateManager.completeSyncSession(
        syncSession.id,
        userId,
        {
          activities_stored: results.activities_saved + results.activities_updated,
          activities_failed: results.activities_failed
        }
      );

      console.log(`[SyncOrchestrator] Sync completed successfully:`, results);

      return {
        syncId: syncSession.id,
        status: 'completed',
        progress: {
          total_activities: results.total_processed,
          processed_activities: results.total_processed,
          current_phase: 'storing',
          phase_progress: {
            fetching: { status: 'completed', processed: results.total_processed, total: results.total_processed, errors: 0 },
            enriching: { status: 'completed', processed: results.weather_enriched, total: results.total_processed, errors: 0 },
            storing: { status: 'completed', processed: results.activities_saved + results.activities_updated, total: results.total_processed, errors: results.activities_failed }
          },
          start_time: syncSession.started_at,
          percentage_complete: 100
        },
        results
      };

    } catch (error) {
      console.error(`[SyncOrchestrator] Sync failed:`, error);
      
      const syncError = classifyError(error, 'fetching');
      
      // Mark session as failed
      await syncStateManager.failSyncSession(syncSession.id, userId, syncError);

      return {
        syncId: syncSession.id,
        status: 'failed',
        progress: {
          total_activities: 0,
          processed_activities: 0,
          current_phase: 'fetching',
          phase_progress: {
            fetching: { status: 'failed', processed: 0, total: 0, errors: 1 },
            enriching: { status: 'pending', processed: 0, total: 0, errors: 0 },
            storing: { status: 'pending', processed: 0, total: 0, errors: 0 }
          },
          start_time: syncSession.started_at,
          percentage_complete: 0
        },
        error: syncError
      };
    }
  }

  // Execute all sync phases in sequence
  private async executeSyncPhases(
    syncSession: SyncSession,
    options: Required<SyncOrchestrationOptions>
  ): Promise<SyncResults> {
    const startTime = Date.now();
    const errorCollector = new ErrorCollector();
    
    // Phase 1: Fetch activities from Strava
    console.log(`[SyncOrchestrator] Phase 1: Fetching activities from Strava`);
    await syncStateManager.transitionToPhase(syncSession.id, syncSession.user_id, 'fetching');
    
    const stravaActivities = await this.fetchStravaActivities(syncSession, options);
    console.log(`[SyncOrchestrator] Fetched ${stravaActivities.length} activities from Strava`);

    if (stravaActivities.length === 0) {
      return {
        total_processed: 0,
        activities_saved: 0,
        activities_updated: 0,
        activities_skipped: 0,
        activities_failed: 0,
        weather_enriched: 0,
        geocoded: 0,
        duration_seconds: Math.round((Date.now() - startTime) / 1000)
      };
    }

    // Update estimated total
    await syncStateManager.updateProgress(syncSession.id, syncSession.user_id, {
      total_activities_estimated: stravaActivities.length,
      activities_fetched: stravaActivities.length
    });

    // Transform Strava activities to our format
    const enrichedActivities = stravaActivities.map(activity => 
      transformStravaToEnriched(activity, syncSession.user_id, syncSession.id)
    );

    // Phase 2: Enrich with weather data (if enabled)
    let weatherEnriched = 0;
    let geocoded = 0;
    
    if (!options.skipWeatherEnrichment && weatherEnricher.isAvailable()) {
      console.log(`[SyncOrchestrator] Phase 2: Enriching with weather data`);
      await syncStateManager.transitionToPhase(syncSession.id, syncSession.user_id, 'enriching');

      try {
        const enrichmentResult = await weatherEnricher.enrichActivities(
          enrichedActivities,
          (processed, total) => {
            // Update progress in real-time
            syncStateManager.updateProgress(syncSession.id, syncSession.user_id, {
              activities_enriched: processed
            }).catch(err => console.warn('Failed to update enrichment progress:', err));
          }
        );

        // Update activities with enriched data
        for (let i = 0; i < enrichmentResult.enrichedActivities.length; i++) {
          enrichedActivities[i] = enrichmentResult.enrichedActivities[i];
        }

        weatherEnriched = enrichmentResult.metadata.weatherEnriched;
        geocoded = enrichmentResult.metadata.geocoded;

        console.log(`[SyncOrchestrator] Weather enrichment completed: ${weatherEnriched} weather, ${geocoded} geocoded`);

      } catch (error) {
        console.warn(`[SyncOrchestrator] Weather enrichment failed, continuing without:`, error);
        errorCollector.addFromCatch(error, 'enriching');
      }
    } else {
      console.log(`[SyncOrchestrator] Skipping weather enrichment (disabled or unavailable)`);
    }

    // Phase 3: Store activities in database
    console.log(`[SyncOrchestrator] Phase 3: Storing activities in database`);
    await syncStateManager.transitionToPhase(syncSession.id, syncSession.user_id, 'storing');

    // Calculate derived metrics before storing
    const activitiesWithMetrics = enrichedActivities.map(activity => 
      calculateDerivedMetrics(activity)
    );

    const storageResult = await dataStorer.storeActivities(
      activitiesWithMetrics,
      syncSession.user_id,
      syncSession.id
    );

    console.log(`[SyncOrchestrator] Storage completed:`, storageResult.results);

    // Update final progress
    await syncStateManager.updateProgress(syncSession.id, syncSession.user_id, {
      activities_stored: storageResult.results.saved + storageResult.results.updated,
      activities_failed: storageResult.results.failed
    });

    const duration = Math.round((Date.now() - startTime) / 1000);

    return {
      total_processed: stravaActivities.length,
      activities_saved: storageResult.results.saved,
      activities_updated: storageResult.results.updated,
      activities_skipped: storageResult.results.skipped,
      activities_failed: storageResult.results.failed,
      weather_enriched: weatherEnriched,
      geocoded: geocoded,
      duration_seconds: duration
    };
  }

  // Fetch activities from Strava with pagination
  private async fetchStravaActivities(
    syncSession: SyncSession,
    options: Required<SyncOrchestrationOptions>
  ): Promise<any[]> {
    const allActivities: any[] = [];
    let currentPage = 1;
    let hasMore = true;
    const maxPages = Math.ceil(options.maxActivitiesPerSync / options.batchSize);

    while (hasMore && currentPage <= maxPages) {
      try {
        const paginationParams: PaginationParams = {
          page: currentPage,
          per_page: options.batchSize
        };

        // Add time range if specified
        if (syncSession.time_range_start) {
          paginationParams.after = Math.floor(new Date(syncSession.time_range_start).getTime() / 1000);
        }
        if (syncSession.time_range_end) {
          paginationParams.before = Math.floor(new Date(syncSession.time_range_end).getTime() / 1000);
        }

        console.log(`[SyncOrchestrator] Fetching page ${currentPage} with params:`, paginationParams);

        const response = await withRetry(
          () => stravaClient.getActivities(syncSession.user_id, paginationParams),
          'fetching',
          { maxRetries: options.maxRetries }
        );

        allActivities.push(...response.data);
        hasMore = response.pagination.has_more && response.data.length > 0;
        currentPage++;

        console.log(`[SyncOrchestrator] Fetched page ${currentPage - 1}: ${response.data.length} activities (total: ${allActivities.length})`);

        // Update progress
        await syncStateManager.updateProgress(syncSession.id, syncSession.user_id, {
          activities_fetched: allActivities.length
        });

        // Save checkpoint for resumability
        await syncStateManager.saveCheckpoint(syncSession.id, syncSession.user_id, {
          last_strava_page: currentPage - 1,
          last_processed_activity_id: response.data.length > 0 ? response.data[response.data.length - 1].id : undefined,
          batch_progress: {
            fetched: allActivities.length,
            enriched: 0,
            stored: 0
          },
          error_activities: [],
          resume_params: paginationParams
        });

        // Respect rate limits - small delay between pages
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

      } catch (error) {
        console.error(`[SyncOrchestrator] Error fetching page ${currentPage}:`, error);
        
        // For authentication errors, we should stop immediately
        if (error instanceof Error && error.message.includes('authentication')) {
          throw error;
        }
        
        // For other errors, we might want to continue with what we have
        console.warn(`[SyncOrchestrator] Continuing with ${allActivities.length} activities despite error on page ${currentPage}`);
        break;
      }
    }

    return allActivities;
  }

  // Get sync status for a session
  async getSyncStatus(syncId: string, userId: string): Promise<SyncResponse> {
    const syncSession = await syncStateManager.getSyncSession(syncId, userId);
    
    if (!syncSession) {
      throw new SyncError(
        'Sync session not found',
        'SYNC_SESSION_NOT_FOUND',
        'invalid_data',
        'fetching',
        false,
        { syncId, userId }
      );
    }

    const totalActivities = syncSession.total_activities_estimated || 0;
    const processedActivities = Math.max(
      syncSession.activities_fetched,
      syncSession.activities_enriched,
      syncSession.activities_stored
    );

    const percentageComplete = totalActivities > 0 
      ? Math.round((processedActivities / totalActivities) * 100)
      : 0;

    return {
      syncId: syncSession.id,
      status: syncSession.status,
      progress: {
        total_activities: totalActivities,
        processed_activities: processedActivities,
        current_phase: syncSession.current_phase,
        phase_progress: {
          fetching: {
            status: syncSession.activities_fetched > 0 ? 'completed' : 
                   syncSession.current_phase === 'fetching' ? 'in_progress' : 'pending',
            processed: syncSession.activities_fetched,
            total: totalActivities,
            errors: 0
          },
          enriching: {
            status: syncSession.activities_enriched > 0 ? 'completed' : 
                   syncSession.current_phase === 'enriching' ? 'in_progress' : 'pending',
            processed: syncSession.activities_enriched,
            total: totalActivities,
            errors: 0
          },
          storing: {
            status: syncSession.activities_stored > 0 ? 'completed' : 
                   syncSession.current_phase === 'storing' ? 'in_progress' : 'pending',
            processed: syncSession.activities_stored,
            total: totalActivities,
            errors: syncSession.activities_failed
          }
        },
        start_time: syncSession.started_at,
        percentage_complete: percentageComplete
      },
      error: syncSession.last_error
    };
  }

  // Cancel a running sync
  async cancelSync(syncId: string, userId: string): Promise<void> {
    console.log(`[SyncOrchestrator] Cancelling sync ${syncId} for user ${userId}`);
    
    await syncStateManager.cancelSyncSession(syncId, userId);
    
    console.log(`[SyncOrchestrator] Sync ${syncId} cancelled successfully`);
  }

  // Resume a failed sync from checkpoint
  async resumeSync(syncId: string, userId: string): Promise<SyncResponse> {
    console.log(`[SyncOrchestrator] Resuming sync ${syncId} for user ${userId}`);
    
    const syncSession = await syncStateManager.getSyncSession(syncId, userId);
    
    if (!syncSession) {
      throw new SyncError(
        'Sync session not found',
        'SYNC_SESSION_NOT_FOUND',
        'invalid_data',
        'fetching',
        false,
        { syncId, userId }
      );
    }

    if (syncSession.status !== 'failed') {
      throw new SyncError(
        'Can only resume failed sync sessions',
        'INVALID_SYNC_STATE',
        'invalid_data',
        'fetching',
        false,
        { syncId, status: syncSession.status }
      );
    }

    // Reset session to initiated state
    await syncStateManager.updateSyncSession(syncId, userId, {
      status: 'initiated',
      current_phase: 'fetching',
      retry_count: syncSession.retry_count + 1
    });

    // Create a new sync request based on the original session
    const resumeRequest: SyncRequest = {
      userId,
      timeRange: {
        after: syncSession.time_range_start ? Math.floor(new Date(syncSession.time_range_start).getTime() / 1000) : undefined,
        before: syncSession.time_range_end ? Math.floor(new Date(syncSession.time_range_end).getTime() / 1000) : undefined
      }
    };

    // Execute the sync (this will use the existing session)
    return await this.orchestrateSync(resumeRequest);
  }

  // Get sync history for a user
  async getSyncHistory(userId: string, limit: number = 10): Promise<SyncSession[]> {
    return await syncStateManager.getSyncHistory(userId, limit);
  }

  // Clean up old sync sessions
  async cleanupOldSessions(userId: string, keepDays: number = 7): Promise<number> {
    return await syncStateManager.cleanupOldSessions(userId, keepDays);
  }
}

// Export singleton instance
export const syncOrchestrator = new SyncOrchestrator();