// Secure API Client - No credentials exposed to frontend
// All sensitive operations happen in Netlify Functions

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
  weather_data: any; // Contains weather details
  strava_data: any;  // Contains full Strava activity, including splits_metric, laps etc.
  // Potentially also direct columns like splits_metric, splits_standard, laps if defined on the 'runs' table
  splits_metric?: any; // Example if it's a direct column
  splits_standard?: any; // Example if it's a direct column
  laps?: any; // Example if it's a direct column
}

export interface RunStats {
  total_runs: number;
  total_distance: number;
  total_time: number;
  average_pace: number; // seconds per km
  average_distance: number; // meters
}

// RunSplit interface can remain for potential client-side parsing,
// but it's not directly part of getUserRuns response structure anymore.
export interface RunSplit {
  id: string;
  enriched_run_id: string;
  user_id: string;
  split_number: number;
  distance: number;
  elapsed_time: number;
  moving_time?: number;
  average_speed?: number;
  average_heartrate?: number | null;
  total_elevation_gain?: number | null;
}

// Type for pagination parameters for chunked sync
export interface StravaPaginationParams {
    page?: number;
    // Could also include 'before' (timestamp) if Strava API is called with date cursors
    // For now, page-based is simpler to start with.
    per_page?: number; // To control chunk size, defaults to Strava's default if not set
}

// Expected response from the chunk processing Netlify function
export interface ProcessChunkResponse {
    processedActivityCount: number; // Number of activities received from Strava in this chunk
    savedCount: number;
    skippedCount: number;
    nextPageParams: StravaPaginationParams | null; // Params for the next chunk, or null if done
    isComplete: boolean; // True if this was the last chunk or no more activities
}


class SecureApiClient {
  private baseUrl: string;

  constructor() {
    // Only the Netlify Functions URL - no sensitive credentials!
    this.baseUrl = '/.netlify/functions';
  }

  // Authentication flow
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

  // fetchUserActivities is called by syncUserData and will be called by processStravaActivityChunk
  // It needs to correctly pass pagination to the 'fetch-activities' Netlify function
  async fetchUserActivities(userId: string, params: { days?: number; page?: number; per_page?: number }): Promise<any[]> {
    console.log(`📥 Fetching activities for user ${userId} with params:`, params);
    
    const response = await fetch(`${this.baseUrl}/fetch-activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Body now sends a structured object for params
      body: JSON.stringify({ userId, params }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch activities');
    }

    const data = await response.json();
    return data.activities || []; // activities, not runs, as per previous use in syncUserData
  }

  async enrichWithWeather(activities: any[]): Promise<any[]> {
    console.log(`🌤️ Enriching ${activities.length} activities with weather data...`);
    
    const response = await fetch(`${this.baseUrl}/enrich-weather`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activities }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to enrich with weather');
    }

    const data = await response.json();
    return data.activities;
  }

  async saveRuns(userId: string, activities: any[]): Promise<{ savedCount: number; skippedCount: number }> {
    console.log(`💾 Saving ${activities.length} runs to database...`);
    
    const response = await fetch(`${this.baseUrl}/save-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, activities }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save runs');
    }

    const data = await response.json();
    return {
      savedCount: data.saved_count,
      skippedCount: data.skipped_count
    };
  }

  // MODIFIED: getUserRuns - removed splits from direct return type
  async getUserRuns(userId: string): Promise<{ runs: Run[]; stats: RunStats; count?: number }> { // count is also in response
    console.log(`📖 Fetching runs and stats for user ${userId}...`); // Updated log
    
    const response = await fetch(`${this.baseUrl}/get-user-runs?userId=${userId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch user runs and stats'); // Updated error
    }

    const data = await response.json();
    // The Netlify function now returns: { success, runs, stats, count }
    return {
      runs: data.runs || [],
      stats: data.stats,
      count: data.count // Keep count as it's provided by the function
      // 'splits' field is no longer expected here
    };
  }

  // Existing syncUserData for fixed day periods
  async syncUserData(userId: string, days: number): Promise<{
    activities: any[];
    savedCount: number;
    skippedCount: number;
  }> {
    console.log(`🔄 Starting data sync for last ${days} days...`);
    try {
      // Pass days in the params object to fetchUserActivities
      const activities = await this.fetchUserActivities(userId, { days });
      console.log(`✅ Fetched ${activities.length} activities for last ${days} days`);
      if (activities.length === 0) {
        return { activities: [], savedCount: 0, skippedCount: 0 };
      }
      const enrichedActivities = await this.enrichWithWeather(activities);
      console.log(`✅ Enriched activities with weather data`);

      const { savedCount, skippedCount } = await this.saveRuns(userId, enrichedActivities);
      console.log(`✅ Saved ${savedCount} runs, skipped ${skippedCount}`);
      return { activities: enrichedActivities, savedCount, skippedCount };
    } catch (error) {
      console.error(`❌ Data sync for ${days} days failed:`, error);
      throw error;
    }
  }

  // NEW method for processing a single chunk of "All Time" sync
  async processStravaActivityChunk(userId: string, paginationParams: StravaPaginationParams): Promise<ProcessChunkResponse> {
    console.log(`🔄 Processing Strava activity chunk for user ${userId}, params:`, paginationParams);
    const response = await fetch(`${this.baseUrl}/process-strava-chunk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, paginationParams }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to process activity chunk and parse error response' }));
        throw new Error(errorData.message || 'Failed to process activity chunk');
    }
    return response.json();
  }
}

export const apiClient = new SecureApiClient();
export type { User, Run, RunStats, RunSplit, StravaPaginationParams, ProcessChunkResponse };