// Simple API Client - Uses simplified single-user functions

export interface User {
  id: string | number; // Can be Strava user ID (number) or string
  strava_id: number;
  name: string;
  email?: string;
}

export interface Run {
  id: string | number;
  strava_id: number;
  name: string;
  distance: number;
  distance_meters: number;
  moving_time: number;
  moving_time_seconds: number;
  elapsed_time: number;
  elapsed_time_seconds: number;
  start_date: string;
  start_date_local: string;
  start_latitude: number | null;
  start_longitude: number | null;
  end_latitude: number | null;
  end_longitude: number | null;
  average_speed: number;
  average_speed_ms: number;
  max_speed: number;
  max_speed_ms: number;
  average_heartrate: number | null;
  average_heartrate_bpm: number | null;
  max_heartrate: number | null;
  max_heartrate_bpm: number | null;
  total_elevation_gain: number;
  total_elevation_gain_meters: number;
  activity_type: string;
  weather_data: any;
  strava_data: any;
  created_at: string;
  updated_at: string;
}

export interface RunStats {
  total_runs: number;
  total_distance: number;
  total_moving_time: number;
  average_pace_seconds_per_km: number;
  average_distance_per_run_meters: number;
}

export interface SyncRequest {
  userId: string | number;
  timeRange?: {
    after?: number;
    before?: number;
  };
  options?: {
    batchSize?: number;
    skipWeatherEnrichment?: boolean;
  };
}

export interface SyncResponse {
  success: boolean;
  message: string;
  timestamp: string;
  status: string;
  results: {
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

  // NEW: Start a sync using the simplified sync-data function with chunked processing
  async startSync(userId: string | number, syncRequest: SyncRequest = {}): Promise<SyncResponse> {
    console.log(`🔄 Starting sync for user ${userId}`, syncRequest);
    
    return await this.executeChunkedSync(userId, syncRequest);
  }

  // Execute chunked sync to handle large datasets elegantly
  private async executeChunkedSync(userId: string | number, syncRequest: SyncRequest = {}): Promise<SyncResponse> {
    let chunkIndex = 0;
    let hasMoreChunks = true;
    let totalResults = {
      total_processed: 0,
      activities_saved: 0,
      activities_updated: 0,
      activities_skipped: 0,
      activities_failed: 0,
      weather_enriched: 0,
      geocoded: 0,
      duration_seconds: 0
    };

    console.log(`🔄 Starting chunked sync for user ${userId}`);

    while (hasMoreChunks) {
      const requestBody = {
        userId: userId,
        timeRange: syncRequest.timeRange,
        options: syncRequest.options,
        chunkIndex: chunkIndex,
        chunkSize: 20 // Process 20 runs at a time with full weather enrichment
      };
      
      console.log(`🔄 Processing chunk ${chunkIndex + 1}...`);
      
      const response = await fetch(`${this.baseUrl}/sync-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to sync chunk ${chunkIndex + 1}`);
      }

      const data = await response.json();
      
      // Accumulate results from this chunk
      if (data.results) {
        totalResults.total_processed += data.results.total_processed || 0;
        totalResults.activities_saved += data.results.activities_saved || 0;
        totalResults.activities_updated += data.results.activities_updated || 0;
        totalResults.activities_skipped += data.results.activities_skipped || 0;
        totalResults.activities_failed += data.results.activities_failed || 0;
        totalResults.weather_enriched += data.results.weather_enriched || 0;
        totalResults.geocoded += data.results.geocoded || 0;
        totalResults.duration_seconds += data.results.duration_seconds || 0;
      }

      // Check if there are more chunks to process
      if (data.chunking && data.chunking.hasMoreChunks) {
        hasMoreChunks = true;
        chunkIndex = data.chunking.nextChunkIndex;
        
        console.log(`✅ Chunk ${chunkIndex} completed. Processing chunk ${chunkIndex + 1} of ${data.chunking.totalChunks}...`);
        console.log(`📊 Progress: ${data.chunking.processedSoFar}/${data.chunking.totalActivities} activities processed`);
        
        // Small delay between chunks to be gentle on the server
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        hasMoreChunks = false;
        console.log(`✅ All chunks completed! Total processed: ${totalResults.total_processed} activities`);
      }
    }
    
    // Return the combined response
    return {
      success: true,
      message: `Chunked sync completed successfully. Processed ${totalResults.total_processed} activities with full weather enrichment.`,
      timestamp: new Date().toISOString(),
      status: 'completed',
      results: totalResults
    };
  }

  // Get user runs using simplified get-runs function
  async getUserRuns(userId: string | number): Promise<{ runs: Run[]; stats: RunStats; count?: number }> {
    console.log(`📖 Fetching runs and stats for user ${userId}...`);
    
    const response = await fetch(`${this.baseUrl}/get-runs?userId=${userId}`, {
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

  // Simplified cleanup method (no complex session management needed)
  async cleanupStuckSessions(userId: string | number): Promise<void> {
    console.log(`🧹 Note: No cleanup needed with simplified sync approach for user ${userId}`);
    // No-op for simplified approach - no complex session management
    return Promise.resolve();
  }
}

// Create and export the API client instance
const apiClient = new SecureApiClient();
export { apiClient };