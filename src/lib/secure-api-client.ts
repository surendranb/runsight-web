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
  weather_data: any;
  strava_data: any;
}

export interface RunStats {
  total_runs: number;
  total_distance: number;
  total_time: number;
  average_pace: number; // seconds per km
  average_distance: number; // meters
}

// Add RunSplit interface, ensuring it matches the expected structure
export interface RunSplit {
  id: string; // UUID from database
  enriched_run_id: string; // Foreign key to runs.id
  user_id: string; // Foreign key to users.id
  split_number: number;
  distance: number; // meters
  elapsed_time: number; // seconds
  moving_time?: number; // Optional: if available
  average_speed?: number; // Optional: m/s
  average_heartrate?: number | null; // Optional: bpm
  total_elevation_gain?: number | null; // Optional: meters for the split
  // Add other fields as per your 'run_splits' table schema
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

  async getUserRuns(userId: string): Promise<{ runs: Run[]; stats: RunStats; splits: RunSplit[] }> {
    console.log(`📖 Fetching runs, stats, and splits for user ${userId}...`);
    
    const response = await fetch(`${this.baseUrl}/get-user-runs?userId=${userId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch user runs, stats, and splits');
    }

    const data = await response.json();
    // Ensure the response structure matches what the Netlify function now sends
    return {
      runs: data.runs || [], // Default to empty array if undefined
      stats: data.stats,
      splits: data.splits || [] // Default to empty array if undefined
    };
  }

  // ... (syncUserData remains the same, but will now benefit from getUserRuns returning splits if that's part of a reload) ...
  // Complete flow: Fetch → Enrich → Save
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