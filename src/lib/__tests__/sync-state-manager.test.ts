// Unit tests for Sync State Manager

import { SyncStateManager } from '../sync-state-manager';
import { SyncSession, SyncStatus, SyncPhase, SyncType } from '../../types/sync';

// Mock the database module
jest.mock('../database', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
          })),
          in: jest.fn(() => ({
            order: jest.fn()
          })),
          order: jest.fn(),
          range: jest.fn()
        })),
        in: jest.fn(() => ({
          order: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          in: jest.fn(() => ({
            lt: jest.fn(() => ({
              select: jest.fn()
            }))
          }))
        }))
      }))
    }))
  },
  handleDatabaseError: jest.fn((error) => new Error(error.message)),
  withRetry: jest.fn((fn) => fn()),
  logDatabaseOperation: jest.fn()
}));

describe('SyncStateManager', () => {
  let syncStateManager: SyncStateManager;
  const mockUserId = 'test-user-id';
  const mockSessionId = 'test-session-id';

  beforeEach(() => {
    syncStateManager = new SyncStateManager();
    jest.clearAllMocks();
  });

  describe('createSyncSession', () => {
    it('should create a new sync session successfully', async () => {
      const mockSession: SyncSession = {
        id: mockSessionId,
        user_id: mockUserId,
        sync_type: 'full',
        status: 'initiated',
        current_phase: 'fetching',
        total_activities_estimated: 0,
        activities_fetched: 0,
        activities_enriched: 0,
        activities_stored: 0,
        activities_failed: 0,
        error_count: 0,
        retry_count: 0,
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        last_successful_page: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock no active sessions
      const { supabaseAdmin } = require('../database');
      supabaseAdmin.from().select().eq().in().order.mockResolvedValue({
        data: [],
        error: null
      });

      // Mock successful insert
      supabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: mockSession,
        error: null
      });

      const result = await syncStateManager.createSyncSession(mockUserId, 'full');

      expect(result).toEqual(mockSession);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('sync_sessions');
    });

    it('should throw error if user has active sync sessions', async () => {
      const mockActiveSession: SyncSession = {
        id: 'active-session-id',
        user_id: mockUserId,
        sync_type: 'full',
        status: 'fetching',
        current_phase: 'fetching',
        total_activities_estimated: 0,
        activities_fetched: 0,
        activities_enriched: 0,
        activities_stored: 0,
        activities_failed: 0,
        error_count: 0,
        retry_count: 0,
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        last_successful_page: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { supabaseAdmin } = require('../database');
      supabaseAdmin.from().select().eq().in().order.mockResolvedValue({
        data: [mockActiveSession],
        error: null
      });

      await expect(
        syncStateManager.createSyncSession(mockUserId, 'full')
      ).rejects.toThrow('User already has 1 active sync session(s)');
    });
  });

  describe('getSyncSession', () => {
    it('should retrieve sync session successfully', async () => {
      const mockSession: SyncSession = {
        id: mockSessionId,
        user_id: mockUserId,
        sync_type: 'full',
        status: 'fetching',
        current_phase: 'fetching',
        total_activities_estimated: 100,
        activities_fetched: 50,
        activities_enriched: 0,
        activities_stored: 0,
        activities_failed: 0,
        error_count: 0,
        retry_count: 0,
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        last_successful_page: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { supabaseAdmin } = require('../database');
      supabaseAdmin.from().select().eq().eq().single.mockResolvedValue({
        data: mockSession,
        error: null
      });

      const result = await syncStateManager.getSyncSession(mockSessionId, mockUserId);

      expect(result).toEqual(mockSession);
    });

    it('should return null if session not found', async () => {
      const { supabaseAdmin } = require('../database');
      supabaseAdmin.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // Not found error
      });

      const result = await syncStateManager.getSyncSession(mockSessionId, mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('updateSyncSession', () => {
    it('should update sync session successfully', async () => {
      const updates = {
        activities_fetched: 75,
        current_phase: 'enriching' as SyncPhase
      };

      const updatedSession: SyncSession = {
        id: mockSessionId,
        user_id: mockUserId,
        sync_type: 'full',
        status: 'fetching',
        current_phase: 'enriching',
        total_activities_estimated: 100,
        activities_fetched: 75,
        activities_enriched: 0,
        activities_stored: 0,
        activities_failed: 0,
        error_count: 0,
        retry_count: 0,
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        last_successful_page: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { supabaseAdmin } = require('../database');
      supabaseAdmin.from().update().eq().eq().select().single.mockResolvedValue({
        data: updatedSession,
        error: null
      });

      const result = await syncStateManager.updateSyncSession(mockSessionId, mockUserId, updates);

      expect(result).toEqual(updatedSession);
    });
  });

  describe('transitionToPhase', () => {
    it('should transition from fetching to enriching', async () => {
      const currentSession: SyncSession = {
        id: mockSessionId,
        user_id: mockUserId,
        sync_type: 'full',
        status: 'fetching',
        current_phase: 'fetching',
        total_activities_estimated: 100,
        activities_fetched: 100,
        activities_enriched: 0,
        activities_stored: 0,
        activities_failed: 0,
        error_count: 0,
        retry_count: 0,
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        last_successful_page: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { supabaseAdmin } = require('../database');
      
      // Mock getSyncSession
      supabaseAdmin.from().select().eq().eq().single.mockResolvedValue({
        data: currentSession,
        error: null
      });

      // Mock updateSyncSession
      const updatedSession = { ...currentSession, current_phase: 'enriching' };
      supabaseAdmin.from().update().eq().eq().select().single.mockResolvedValue({
        data: updatedSession,
        error: null
      });

      const result = await syncStateManager.transitionToPhase(
        mockSessionId, 
        mockUserId, 
        'enriching'
      );

      expect(result.current_phase).toBe('enriching');
    });

    it('should reject invalid phase transitions', async () => {
      const currentSession: SyncSession = {
        id: mockSessionId,
        user_id: mockUserId,
        sync_type: 'full',
        status: 'enriching',
        current_phase: 'enriching',
        total_activities_estimated: 100,
        activities_fetched: 100,
        activities_enriched: 50,
        activities_stored: 0,
        activities_failed: 0,
        error_count: 0,
        retry_count: 0,
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        last_successful_page: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { supabaseAdmin } = require('../database');
      supabaseAdmin.from().select().eq().eq().single.mockResolvedValue({
        data: currentSession,
        error: null
      });

      await expect(
        syncStateManager.transitionToPhase(mockSessionId, mockUserId, 'fetching')
      ).rejects.toThrow('Invalid phase transition from enriching to fetching');
    });
  });

  describe('completeSyncSession', () => {
    it('should mark session as completed with final counts', async () => {
      const completedSession: SyncSession = {
        id: mockSessionId,
        user_id: mockUserId,
        sync_type: 'full',
        status: 'completed',
        current_phase: 'storing',
        total_activities_estimated: 100,
        activities_fetched: 100,
        activities_enriched: 95,
        activities_stored: 90,
        activities_failed: 5,
        error_count: 0,
        retry_count: 0,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        last_successful_page: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { supabaseAdmin } = require('../database');
      supabaseAdmin.from().update().eq().eq().select().single.mockResolvedValue({
        data: completedSession,
        error: null
      });

      const result = await syncStateManager.completeSyncSession(
        mockSessionId,
        mockUserId,
        { activities_stored: 90, activities_failed: 5 }
      );

      expect(result.status).toBe('completed');
      expect(result.activities_stored).toBe(90);
      expect(result.activities_failed).toBe(5);
      expect(result.completed_at).toBeDefined();
    });
  });

  describe('canStartNewSync', () => {
    it('should allow new sync when no active sessions exist', async () => {
      const { supabaseAdmin } = require('../database');
      supabaseAdmin.from().select().eq().in().order.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await syncStateManager.canStartNewSync(mockUserId);

      expect(result.canStart).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should prevent new sync when active sessions exist', async () => {
      const activeSession: SyncSession = {
        id: 'active-session',
        user_id: mockUserId,
        sync_type: 'full',
        status: 'fetching',
        current_phase: 'fetching',
        total_activities_estimated: 0,
        activities_fetched: 0,
        activities_enriched: 0,
        activities_stored: 0,
        activities_failed: 0,
        error_count: 0,
        retry_count: 0,
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        last_successful_page: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { supabaseAdmin } = require('../database');
      supabaseAdmin.from().select().eq().in().order.mockResolvedValue({
        data: [activeSession],
        error: null
      });

      const result = await syncStateManager.canStartNewSync(mockUserId);

      expect(result.canStart).toBe(false);
      expect(result.reason).toBe('1 sync session(s) already in progress');
    });

    it('should auto-cancel stuck sessions and allow new sync', async () => {
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

      const stuckSession: SyncSession = {
        id: 'stuck-session',
        user_id: mockUserId,
        sync_type: 'full',
        status: 'fetching',
        current_phase: 'fetching',
        total_activities_estimated: 0,
        activities_fetched: 0,
        activities_enriched: 0,
        activities_stored: 0,
        activities_failed: 0,
        error_count: 0,
        retry_count: 0,
        started_at: twoHoursAgo.toISOString(),
        last_activity_at: twoHoursAgo.toISOString(),
        last_successful_page: 0,
        created_at: twoHoursAgo.toISOString(),
        updated_at: twoHoursAgo.toISOString()
      };

      const { supabaseAdmin } = require('../database');
      
      // First call returns stuck session
      supabaseAdmin.from().select().eq().in().order.mockResolvedValueOnce({
        data: [stuckSession],
        error: null
      });

      // Mock cancelSyncSession (updateSyncSession)
      supabaseAdmin.from().update().eq().eq().select().single.mockResolvedValue({
        data: { ...stuckSession, status: 'cancelled' },
        error: null
      });

      const result = await syncStateManager.canStartNewSync(mockUserId);

      expect(result.canStart).toBe(true);
    });
  });

  describe('getSyncStatistics', () => {
    it('should calculate sync statistics correctly', async () => {
      const mockSessions = [
        {
          status: 'completed',
          started_at: '2024-01-01T10:00:00Z',
          completed_at: '2024-01-01T10:30:00Z'
        },
        {
          status: 'completed',
          started_at: '2024-01-02T10:00:00Z',
          completed_at: '2024-01-02T10:45:00Z'
        },
        {
          status: 'failed',
          started_at: '2024-01-03T10:00:00Z',
          completed_at: '2024-01-03T10:15:00Z'
        }
      ];

      const { supabaseAdmin } = require('../database');
      supabaseAdmin.from().select().eq().not.mockResolvedValue({
        data: mockSessions,
        error: null
      });

      const result = await syncStateManager.getSyncStatistics(mockUserId);

      expect(result.total_syncs).toBe(3);
      expect(result.successful_syncs).toBe(2);
      expect(result.failed_syncs).toBe(1);
      expect(result.average_duration_minutes).toBe(30); // (30 + 45 + 15) / 3
      expect(result.last_sync_at).toBe('2024-01-03T10:00:00Z');
    });
  });
});