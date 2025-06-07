export interface User {
  id: string;
  strava_id: number;
  email: string;
  first_name: string;
  last_name: string;
  profile_medium: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  strava_id: number;
  user_id: string;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  start_date: string;
  start_date_local: string;
  timezone: string;
  utc_offset: number;
  start_latlng: [number, number] | null;
  end_latlng: [number, number] | null;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  achievement_count: number;
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  average_speed: number;
  max_speed: number;
  average_heartrate: number | null;
  max_heartrate: number | null;
  suffer_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface Weather {
  id: string;
  activity_id: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  weather_main: string;
  weather_description: string;
  weather_icon: string;
  clouds: number;
  created_at: string;
}

export interface StravaAuthResponse {
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete: {
    id: number;
    username: string;
    resource_state: number;
    firstname: string;
    lastname: string;
    bio: string;
    city: string;
    state: string;
    country: string;
    sex: string;
    premium: boolean;
    summit: boolean;
    created_at: string;
    updated_at: string;
    badge_type_id: number;
    weight: number;
    profile_medium: string;
    profile: string;
    friend: null;
    follower: null;
  };
}

export interface ActivityStats {
  totalRuns: number;
  totalDistance: number;
  totalTime: number;
  averagePace: number;
  totalElevation: number;
  averageHeartRate: number;
  bestDistance: number;
  bestTime: number;
  bestPace: number;
}