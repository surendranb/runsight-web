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
  average_pace: number;
  average_distance: number;
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

  async getUserRuns(userId: string): Promise<{ runs: Run[]; stats: RunStats }> {
    console.log(`📖 Fetching runs for user ${userId}...`);
    
    const response = await fetch(`${this.baseUrl}/get-user-runs?userId=${userId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch user runs');
    }

    const data = await response.json();
    return {
      runs: data.runs,
      stats: data.stats
    };
  }

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

// Export types
export type { User, Run, RunStats };