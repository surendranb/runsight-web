// New Secure API Client - Uses the robust sync orchestrator

export interface User {
  id: string;
  strava_id: number;
  name: string;
}

export interface Run {
  id: string;
  user_id: string;
  strava_id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  start_date: string;
  start_date_local: string;
  start_latlng: string | null;
  end_latlng: string | null;
  average_speed: number;
  max_speed: number;
  average_heartrate: number | null;
  max_heartrate: number | null;
  total_elevation_gain: number;
  weather_data: any;
  strava_data: any;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

export interface RunStats {
  total_runs: number;
  total_distance: number;
  total_moving_time: number;
  average_pace_seconds_per_km: number;
  average_distance_per_run_meters: number;
}

export interface SyncRequest {
  timeRange?: {
    after?: number;
    before?: number;
  };
  options?: {
    batchSize?: number;
    maxRetries?: number;
    skipWeatherEnrichment?: boolean;
  };
}

export interface SyncResponse {
  success: boolean;
  syncId: string;
  status: string;
  progress: {
    total_activities: number;
    processed_activities: number;
    current_phase: string;
    percentage_complete: number;
  };
  results?: {
    total_processed: number;
    activities_saved: number;
    activities_updated: number;
    activities_skipped: number;
    activities_failed: number;
    weather_enriched: number;
    geocoded: number;
    duration_seconds: number;
  };
  error?: any;
}

class SecureApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/.netlify/functions';
  }

  // Authentication flow (keeping existing methods for compatibility)
  async getStravaAuthUrl(): Promise<string> {
    console.log('🔗 Getting Strava authorization URL...');
    
    const response = await fetch(`${this.baseUrl}/auth-strava`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to get authorization URL');
    }

    const data = await response.json();
    return data.authUrl;
  }

  async authenticateWithStrava(code: string): Promise<{ user: User; sessionUrl: string }> {
    console.log('🔐 Authenticating with Strava...');
    
    const response = await fetch(`${this.baseUrl}/auth-strava`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Authentication failed');
    }

    const data = await response.json();
    return {
      user: data.user,
      sessionUrl: data.session_url
    };
  }

  // NEW: Start a sync using the robust sync orchestrator
  async startSync(userId: string, syncRequest: SyncRequest = {}): Promise<SyncResponse> {
    console.log(`🔄 Starting sync for user ${userId}`, syncRequest);
    
    const response = await fetch(`${this.baseUrl}/sync-orchestrator?userId=${userId}&action=sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncRequest),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to start sync');
    }

    return await response.json();
  }

  // NEW: Get sync status
  async getSyncStatus(userId: string, syncId: string): Promise<SyncResponse> {
    console.log(`📊 Getting sync status for ${syncId}`);
    
    const response = await fetch(`${this.baseUrl}/sync-orchestrator?userId=${userId}&syncId=${syncId}&action=status`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get sync status');
    }

    return await response.json();
  }

  // NEW: Cancel sync
  async cancelSync(userId: string, syncId: string): Promise<void> {
    console.log(`❌ Cancelling sync ${syncId}`);
    
    const response = await fetch(`${this.baseUrl}/sync-orchestrator?userId=${userId}&action=cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syncId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel sync');
    }
  }

  // NEW: Resume failed sync
  async resumeSync(userId: string, syncId: string): Promise<SyncResponse> {
    console.log(`🔄 Resuming sync ${syncId}`);
    
    const response = await fetch(`${this.baseUrl}/sync-orchestrator?userId=${userId}&action=resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syncId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to resume sync');
    }

    return await response.json();
  }

  // NEW: Get sync history
  async getSyncHistory(userId: string): Promise<any[]> {
    console.log(`📜 Getting sync history for user ${userId}`);
    
    const response = await fetch(`${this.baseUrl}/sync-orchestrator?userId=${userId}&action=history`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get sync history');
    }

    const data = await response.json();
    return data.history || [];
  }

  // Get user runs (updated to use new data store)
  async getUserRuns(userId: string): Promise<{ runs: Run[]; stats: RunStats; count?: number }> {
    console.log(`📖 Fetching runs and stats for user ${userId}...`);
    
    const response = await fetch(`${this.baseUrl}/get-user-runs?userId=${userId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch user runs and stats');
    }

    const data = await response.json();
    return {
      runs: data.runs || [],
      stats: data.stats,
      count: data.count
    };
  }

  // DEPRECATED: Old chunked sync method (for backward compatibility)
  async processStravaActivityChunk(userId: string, paginationParams: any): Promise<any> {
    console.warn('⚠️ processStravaActivityChunk is deprecated. Use startSync() instead.');
    
    // Convert old pagination params to new sync request format
    const syncRequest: SyncRequest = {
      timeRange: {
        after: paginationParams.after,
        before: paginationParams.before
      },
      options: {
        batchSize: paginationParams.per_page || 50
      }
    };

    const response = await this.startSync(userId, syncRequest);
    
    // Convert new response format to old format for compatibility
    return {
      processedActivityCount: response.results?.total_processed || 0,
      savedCount: response.results?.activities_saved || 0,
      skippedCount: response.results?.activities_skipped || 0,
      isComplete: response.status === 'completed',
      processedCount: response.results?.total_processed || 0
    };
  }
}

// Create and export the API client instance
const apiClient = new SecureApiClient();
export { apiClient };