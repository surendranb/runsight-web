// Sync State Manager - Handles sync session state persistence and recovery

import { supabaseAdmin, handleDatabaseError, withRetry, logDatabaseOperation } from './database';
import { SyncSession, SyncStatus, SyncPhase, SyncType, CheckpointData, SyncError } from '../types/sync';
import { validateSyncSession } from './validation';
import { classifyError } from './errors';

export class SyncStateManager {
  // Create a new sync session
  async createSyncSession(
    userId: string,
    syncType: SyncType = 'full',
    timeRangeStart?: string,
    timeRangeEnd?: string
  ): Promise<SyncSession> {
    const startTime = Date.now();
    
    try {
      // Check for existing active sync sessions
      const activeSessions = await this.getActiveSyncSessions(userId);
      if (activeSessions.length > 0) {
        throw new Error(`User already has ${activeSessions.length} active sync session(s). Please wait for completion or cancel existing syncs.`);
      }

      const sessionData = {
        user_id: userId,
        sync_type: syncType,
        time_range_start: timeRangeStart,
        time_range_end: timeRangeEnd,
        status: 'initiated' as SyncStatus,
        current_phase: 'fetching' as SyncPhase,
        total_activities_estimated: 0,
        activities_fetched: 0,
        activities_enriched: 0,
        activities_stored: 0,
        activities_failed: 0,
        error_count: 0,
        retry_count: 0,
        last_successful_page: 0
      };

      // Validate the session data
      validateSyncSession(sessionData);

      const { data, error } = await supabaseAdmin
        .from('sync_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        throw handleDatabaseError(error, 'createSyncSession');
      }

      const duration = Date.now() - startTime;
      logDatabaseOperation('createSyncSession', duration, 1);

      return data as SyncSession;
    } catch (error) {
      const duration = Date.now() - startTime;
      logDatabaseOperation('createSyncSession', duration, 0, error as Error);
      throw classifyError(error, 'fetching');
    }
  }

  // Get sync session by ID
  async getSyncSession(sessionId: string, userId: string): Promise<SyncSession | null> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabaseAdmin
        .from('sync_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Session not found
        }
        throw handleDatabaseError(error, 'getSyncSession');
      }

      const duration = Date.now() - startTime;
      logDatabaseOperation('getSyncSession', duration, 1);

      return data as SyncSession;
    } catch (error) {
      const duration = Date.now() - startTime;
      logDatabaseOperation('getSyncSession', duration, 0, error as Error);
      throw classifyError(error, 'fetching');
    }
  }

  // Get all active sync sessions for a user
  async getActiveSyncSessions(userId: string): Promise<SyncSession[]> {
    const startTime = Date.now();
    
    try {
      const activeStatuses: SyncStatus[] = ['initiated', 'fetching', 'enriching', 'storing'];
      
      const { data, error } = await supabaseAdmin
        .from('sync_sessions')
        .select('*')
        .eq('user_id', userId)
        .in('status', activeStatuses)
        .order('created_at', { ascending: false });

      if (error) {
        throw handleDatabaseError(error, 'getActiveSyncSessions');
      }

      const duration = Date.now() - startTime;
      logDatabaseOperation('getActiveSyncSessions', duration, data?.length || 0);

      return (data || []) as SyncSession[];
    } catch (error) {
      const duration = Date.now() - startTime;
      logDatabaseOperation('getActiveSyncSessions', duration, 0, error as Error);
      throw classifyError(error, 'fetching');
    }
  }

  // Update sync session status and progress
  async updateSyncSession(
    sessionId: string,
    userId: string,
    updates: Partial<SyncSession>
  ): Promise<SyncSession> {
    const startTime = Date.now();
    
    try {
      // Validate the updates
      if (Object.keys(updates).length > 0) {
        validateSyncSession({ ...updates, user_id: userId });
      }

      // Add last_activity_at timestamp
      const updateData = {
        ...updates,
        last_activity_at: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('sync_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw handleDatabaseError(error, 'updateSyncSession');
      }

      const duration = Date.now() - startTime;
      logDatabaseOperation('updateSyncSession', duration, 1);

      return data as SyncSession;
    } catch (error) {
      const duration = Date.now() - startTime;
      logDatabaseOperation('updateSyncSession', duration, 0, error as Error);
      throw classifyError(error, 'storing');
    }
  }

  // Transition sync session to next phase
  async transitionToPhase(
    sessionId: string,
    userId: string,
    newPhase: SyncPhase,
    newStatus?: SyncStatus
  ): Promise<SyncSession> {
    const validTransitions: Record<SyncPhase, SyncPhase[]> = {
      fetching: ['enriching', 'storing'], // Can skip enriching if no weather data needed
      enriching: ['storing'],
      storing: [] // Final phase
    };

    const currentSession = await this.getSyncSession(sessionId, userId);
    if (!currentSession) {
      throw new Error('Sync session not found');
    }

    // Validate transition
    if (!validTransitions[currentSession.current_phase].includes(newPhase) && 
        currentSession.current_phase !== newPhase) {
      throw new Error(
        `Invalid phase transition from ${currentSession.current_phase} to ${newPhase}`
      );
    }

    const updates: Partial<SyncSession> = {
      current_phase: newPhase,
      status: newStatus || currentSession.status
    };

    return await this.updateSyncSession(sessionId, userId, updates);
  }

  // Mark sync session as completed
  async completeSyncSession(
    sessionId: string,
    userId: string,
    finalCounts: {
      activities_stored: number;
      activities_failed: number;
    }
  ): Promise<SyncSession> {
    const updates: Partial<SyncSession> = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      activities_stored: finalCounts.activities_stored,
      activities_failed: finalCounts.activities_failed
    };

    return await this.updateSyncSession(sessionId, userId, updates);
  }

  // Mark sync session as failed
  async failSyncSession(
    sessionId: string,
    userId: string,
    error: SyncError
  ): Promise<SyncSession> {
    const currentSession = await this.getSyncSession(sessionId, userId);
    if (!currentSession) {
      throw new Error('Sync session not found');
    }

    const updates: Partial<SyncSession> = {
      status: 'failed',
      completed_at: new Date().toISOString(),
      last_error: error,
      error_count: currentSession.error_count + 1
    };

    return await this.updateSyncSession(sessionId, userId, updates);
  }

  // Cancel sync session
  async cancelSyncSession(sessionId: string, userId: string): Promise<SyncSession> {
    const updates: Partial<SyncSession> = {
      status: 'cancelled',
      completed_at: new Date().toISOString()
    };

    return await this.updateSyncSession(sessionId, userId, updates);
  }

  // Save checkpoint data for resumable syncs
  async saveCheckpoint(
    sessionId: string,
    userId: string,
    checkpointData: CheckpointData
  ): Promise<SyncSession> {
    const updates: Partial<SyncSession> = {
      checkpoint_data: checkpointData,
      last_successful_page: checkpointData.last_strava_page
    };

    return await this.updateSyncSession(sessionId, userId, updates);
  }

  // Restore checkpoint data for resuming syncs
  async getCheckpoint(sessionId: string, userId: string): Promise<CheckpointData | null> {
    const session = await this.getSyncSession(sessionId, userId);
    return session?.checkpoint_data || null;
  }

  // Update progress counters
  async updateProgress(
    sessionId: string,
    userId: string,
    progress: {
      activities_fetched?: number;
      activities_enriched?: number;
      activities_stored?: number;
      activities_failed?: number;
      total_activities_estimated?: number;
    }
  ): Promise<SyncSession> {
    return await this.updateSyncSession(sessionId, userId, progress);
  }

  // Increment progress counters
  async incrementProgress(
    sessionId: string,
    userId: string,
    increments: {
      activities_fetched?: number;
      activities_enriched?: number;
      activities_stored?: number;
      activities_failed?: number;
    }
  ): Promise<SyncSession> {
    const currentSession = await this.getSyncSession(sessionId, userId);
    if (!currentSession) {
      throw new Error('Sync session not found');
    }

    const updates: Partial<SyncSession> = {};
    
    if (increments.activities_fetched) {
      updates.activities_fetched = currentSession.activities_fetched + increments.activities_fetched;
    }
    if (increments.activities_enriched) {
      updates.activities_enriched = currentSession.activities_enriched + increments.activities_enriched;
    }
    if (increments.activities_stored) {
      updates.activities_stored = currentSession.activities_stored + increments.activities_stored;
    }
    if (increments.activities_failed) {
      updates.activities_failed = currentSession.activities_failed + increments.activities_failed;
    }

    return await this.updateSyncSession(sessionId, userId, updates);
  }

  // Clean up old completed/failed sync sessions
  async cleanupOldSessions(userId: string, keepDays: number = 7): Promise<number> {
    const startTime = Date.now();
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);

      const { data, error } = await supabaseAdmin
        .from('sync_sessions')
        .delete()
        .eq('user_id', userId)
        .in('status', ['completed', 'failed', 'cancelled'])
        .lt('completed_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        throw handleDatabaseError(error, 'cleanupOldSessions');
      }

      const deletedCount = data?.length || 0;
      const duration = Date.now() - startTime;
      logDatabaseOperation('cleanupOldSessions', duration, deletedCount);

      return deletedCount;
    } catch (error) {
      const duration = Date.now() - startTime;
      logDatabaseOperation('cleanupOldSessions', duration, 0, error as Error);
      throw classifyError(error, 'storing');
    }
  }

  // Get sync session history for a user
  async getSyncHistory(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<SyncSession[]> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabaseAdmin
        .from('sync_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw handleDatabaseError(error, 'getSyncHistory');
      }

      const duration = Date.now() - startTime;
      logDatabaseOperation('getSyncHistory', duration, data?.length || 0);

      return (data || []) as SyncSession[];
    } catch (error) {
      const duration = Date.now() - startTime;
      logDatabaseOperation('getSyncHistory', duration, 0, error as Error);
      throw classifyError(error, 'fetching');
    }
  }

  // Check if user can start a new sync (prevent concurrent syncs)
  async canStartNewSync(userId: string): Promise<{ canStart: boolean; reason?: string }> {
    try {
      const activeSessions = await this.getActiveSyncSessions(userId);
      
      if (activeSessions.length === 0) {
        return { canStart: true };
      }

      // Check if any sessions are stuck (older than 1 hour with no activity)
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const stuckSessions = activeSessions.filter(session => 
        new Date(session.last_activity_at) < oneHourAgo
      );

      if (stuckSessions.length > 0) {
        // Auto-cancel stuck sessions
        for (const session of stuckSessions) {
          await this.cancelSyncSession(session.id, userId);
        }
        
        const remainingActive = activeSessions.length - stuckSessions.length;
        if (remainingActive === 0) {
          return { canStart: true };
        }
      }

      return {
        canStart: false,
        reason: `${activeSessions.length} sync session(s) already in progress`
      };
    } catch (error) {
      // If we can't check, err on the side of caution
      return {
        canStart: false,
        reason: 'Unable to verify sync session status'
      };
    }
  }

  // Get sync session statistics
  async getSyncStatistics(userId: string): Promise<{
    total_syncs: number;
    successful_syncs: number;
    failed_syncs: number;
    average_duration_minutes: number;
    last_sync_at?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabaseAdmin
        .from('sync_sessions')
        .select('status, started_at, completed_at')
        .eq('user_id', userId)
        .not('status', 'eq', 'initiated'); // Exclude sessions that never really started

      if (error) {
        throw handleDatabaseError(error, 'getSyncStatistics');
      }

      const sessions = data || [];
      const completedSessions = sessions.filter(s => s.completed_at);
      
      let totalDurationMinutes = 0;
      for (const session of completedSessions) {
        if (session.started_at && session.completed_at) {
          const duration = new Date(session.completed_at).getTime() - new Date(session.started_at).getTime();
          totalDurationMinutes += duration / (1000 * 60); // Convert to minutes
        }
      }

      const stats = {
        total_syncs: sessions.length,
        successful_syncs: sessions.filter(s => s.status === 'completed').length,
        failed_syncs: sessions.filter(s => s.status === 'failed').length,
        average_duration_minutes: completedSessions.length > 0 ? 
          Math.round(totalDurationMinutes / completedSessions.length * 100) / 100 : 0,
        last_sync_at: sessions.length > 0 ? 
          sessions.reduce((latest, session) => 
            session.started_at > latest ? session.started_at : latest, 
            sessions[0].started_at
          ) : undefined
      };

      const duration = Date.now() - startTime;
      logDatabaseOperation('getSyncStatistics', duration, sessions.length);

      return stats;
    } catch (error) {
      const duration = Date.now() - startTime;
      logDatabaseOperation('getSyncStatistics', duration, 0, error as Error);
      throw classifyError(error, 'fetching');
    }
  }
}

// Export singleton instance
export const syncStateManager = new SyncStateManager();