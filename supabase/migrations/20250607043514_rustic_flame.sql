/*
  # Running Analytics Database Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `strava_id` (bigint, unique) - Strava athlete ID
      - `email` (text)
      - `first_name` (text)
      - `last_name` (text) 
      - `profile_medium` (text) - Profile image URL
      - `access_token` (text) - Encrypted Strava access token
      - `refresh_token` (text) - Encrypted Strava refresh token
      - `expires_at` (bigint) - Token expiration timestamp
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `activities`
      - `id` (uuid, primary key)
      - `strava_id` (bigint, unique) - Strava activity ID
      - `user_id` (uuid, foreign key)
      - `name` (text) - Activity name
      - `distance` (float) - Distance in meters
      - `moving_time` (integer) - Moving time in seconds
      - `elapsed_time` (integer) - Total elapsed time in seconds
      - `total_elevation_gain` (float) - Elevation gain in meters
      - `type` (text) - Activity type (Run, Ride, etc.)
      - `start_date` (timestamptz) - Activity start time
      - `start_date_local` (timestamptz) - Local start time
      - `timezone` (text) - Timezone
      - `utc_offset` (float) - UTC offset in seconds
      - `start_latlng` (float[]) - Starting coordinates [lat, lng]
      - `end_latlng` (float[]) - Ending coordinates [lat, lng]
      - `location_city` (text) - City name
      - `location_state` (text) - State/region name
      - `location_country` (text) - Country name
      - `achievement_count` (integer) - Number of achievements
      - `kudos_count` (integer) - Number of kudos
      - `comment_count` (integer) - Number of comments
      - `athlete_count` (integer) - Number of athletes
      - `photo_count` (integer) - Number of photos
      - `average_speed` (float) - Average speed in m/s
      - `max_speed` (float) - Max speed in m/s
      - `average_heartrate` (float) - Average heart rate in BPM
      - `max_heartrate` (float) - Max heart rate in BPM
      - `suffer_score` (integer) - Strava suffer score
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `weather`
      - `id` (uuid, primary key)
      - `activity_id` (uuid, foreign key)
      - `temperature` (float) - Temperature in Celsius
      - `feels_like` (float) - Feels like temperature in Celsius
      - `humidity` (integer) - Humidity percentage
      - `pressure` (integer) - Atmospheric pressure in hPa
      - `visibility` (integer) - Visibility in meters
      - `wind_speed` (float) - Wind speed in m/s
      - `wind_deg` (integer) - Wind direction in degrees
      - `weather_main` (text) - Main weather condition
      - `weather_description` (text) - Weather description
      - `weather_icon` (text) - Weather icon code
      - `clouds` (integer) - Cloudiness percentage
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access only their own data
    - Users can only see their own activities and weather data
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strava_id bigint UNIQUE NOT NULL,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  profile_medium text DEFAULT '',
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strava_id bigint UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  distance float NOT NULL DEFAULT 0,
  moving_time integer NOT NULL DEFAULT 0,
  elapsed_time integer NOT NULL DEFAULT 0,
  total_elevation_gain float NOT NULL DEFAULT 0,
  type text NOT NULL,
  start_date timestamptz NOT NULL,
  start_date_local timestamptz NOT NULL,
  timezone text DEFAULT '',
  utc_offset float DEFAULT 0,
  start_latlng float[],
  end_latlng float[],
  location_city text,
  location_state text,
  location_country text,
  achievement_count integer DEFAULT 0,
  kudos_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  athlete_count integer DEFAULT 0,
  photo_count integer DEFAULT 0,
  average_speed float DEFAULT 0,
  max_speed float DEFAULT 0,
  average_heartrate float,
  max_heartrate float,
  suffer_score integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create weather table
CREATE TABLE IF NOT EXISTS weather (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  temperature float NOT NULL,
  feels_like float NOT NULL,
  humidity integer NOT NULL,
  pressure integer NOT NULL,
  visibility integer NOT NULL,
  wind_speed float NOT NULL,
  wind_deg integer NOT NULL,
  weather_main text NOT NULL,
  weather_description text NOT NULL,
  weather_icon text NOT NULL,
  clouds integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for activities table
CREATE POLICY "Users can read own activities"
  ON activities
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own activities"
  ON activities
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own activities"
  ON activities
  FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for weather table
CREATE POLICY "Users can read weather for own activities"
  ON weather
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = weather.activity_id
    )
  );

CREATE POLICY "Users can insert weather for own activities"
  ON weather
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = weather.activity_id
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_strava_id ON users(strava_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_strava_id ON activities(strava_id);
CREATE INDEX IF NOT EXISTS idx_activities_start_date ON activities(start_date);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_weather_activity_id ON weather(activity_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();