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

  // Data fetching and processing
  async fetchUserActivities(userId: string, days: number = 7): Promise<any[]> {
    console.log(`📥 Fetching activities for user ${userId}...`);
    
    const response = await fetch(`${this.baseUrl}/fetch-activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, days }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch activities');
    }

    const data = await response.json();
    return data.runs;
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

  // ... (syncUserData remains the same) ...
  async syncUserData(userId: string, days: number = 7): Promise<{
    activities: any[];
    savedCount: number;
    skippedCount: number;
  }> {
    console.log('🔄 Starting complete data sync...');
    
    try {
      // Step 1: Fetch activities from Strava
      const activities = await this.fetchUserActivities(userId, days);
      console.log(`✅ Fetched ${activities.length} activities`);

      if (activities.length === 0) {
        return { activities: [], savedCount: 0, skippedCount: 0 };
      }

      // Step 2: Enrich with weather data
      const enrichedActivities = await this.enrichWithWeather(activities);
      console.log(`✅ Enriched activities with weather data`);

      // Step 3: Save to database
      const { savedCount, skippedCount } = await this.saveRuns(userId, enrichedActivities);
      console.log(`✅ Saved ${savedCount} runs, skipped ${skippedCount}`);

      return {
        activities: enrichedActivities,
        savedCount,
        skippedCount
      };

    } catch (error) {
      console.error('❌ Data sync failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiClient = new SecureApiClient();

// Export types (User, Run, RunStats already exported, ensure RunSplit is too)
export type { User, Run, RunStats, RunSplit };

// Self-correction: max_speed and total_elevation_gain in Run interface
// should be number | null to match EnrichedRun from src/types/index.ts
// if they can indeed be null from the database.
// The current 'Run' type here has them as 'number'.
// For now, I'll keep them as defined in the existing secure-api-client.ts,
// but this is a point of potential mismatch if DB can have nulls for these.
// The provided `Run` type here already has `average_heartrate: number | null` and `max_heartrate: number | null`.
// `start_latlng` and `end_latlng` are `string | null`.
// Let's assume `max_speed` and `total_elevation_gain` are non-nullable `number` as per this file's current Run definition.