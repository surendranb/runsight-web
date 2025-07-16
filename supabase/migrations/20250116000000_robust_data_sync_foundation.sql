-- Robust Data Sync Foundation Migration
-- This migration implements a clean slate design for the data sync system
-- It drops existing tables and creates optimized schema for analytics and performance

-- Drop all existing sync-related tables and start fresh
DROP TABLE IF EXISTS public.runs CASCADE;
DROP TABLE IF EXISTS public.sync_sessions CASCADE;

-- Create optimized runs table with better structure
CREATE TABLE public.runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strava_id bigint NOT NULL,
  
  -- Core activity data
  name text NOT NULL,
  activity_type text NOT NULL DEFAULT 'Run',
  distance_meters real NOT NULL,
  moving_time_seconds integer NOT NULL,
  elapsed_time_seconds integer NOT NULL,
  
  -- Timing data
  start_date_utc timestamptz NOT NULL,
  start_date_local timestamptz NOT NULL,
  timezone text,
  
  -- Location data (optimized for queries)
  start_latitude real,
  start_longitude real,
  end_latitude real,
  end_longitude real,
  city text,
  state text,
  country text,
  
  -- Performance metrics
  average_speed_ms real,
  max_speed_ms real,
  average_heartrate_bpm integer,
  max_heartrate_bpm integer,
  total_elevation_gain_meters real,
  
  -- Weather data (structured for analytics)
  temperature_celsius real,
  feels_like_celsius real,
  humidity_percent integer,
  pressure_hpa real,
  wind_speed_ms real,
  wind_direction_degrees integer,
  weather_condition text,
  visibility_meters integer,
  uv_index real,
  
  -- Metadata
  enrichment_status jsonb NOT NULL DEFAULT '{"weather": false, "geocoding": false}',
  strava_data jsonb, -- Full Strava payload for future use
  sync_session_id uuid,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  UNIQUE(user_id, strava_id)
);

-- Sync sessions for robust state management
CREATE TABLE public.sync_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Sync configuration
  sync_type text NOT NULL DEFAULT 'full',
  time_range_start timestamptz,
  time_range_end timestamptz,
  
  -- State management
  status text NOT NULL DEFAULT 'initiated',
  current_phase text NOT NULL DEFAULT 'fetching',
  
  -- Progress tracking
  total_activities_estimated integer DEFAULT 0,
  activities_fetched integer DEFAULT 0,
  activities_enriched integer DEFAULT 0,
  activities_stored integer DEFAULT 0,
  activities_failed integer DEFAULT 0,
  
  -- Error handling
  error_count integer DEFAULT 0,
  last_error jsonb,
  retry_count integer DEFAULT 0,
  
  -- Performance metrics
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  last_activity_at timestamptz DEFAULT now(),
  
  -- Checkpointing for resume capability
  last_successful_page integer DEFAULT 0,
  checkpoint_data jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Optimized indexes for performance
CREATE INDEX idx_runs_user_start_date ON public.runs(user_id, start_date_utc DESC);
CREATE INDEX idx_runs_strava_id ON public.runs(strava_id);
CREATE INDEX idx_runs_location ON public.runs(start_latitude, start_longitude) WHERE start_latitude IS NOT NULL;
CREATE INDEX idx_runs_weather ON public.runs(temperature_celsius, weather_condition) WHERE temperature_celsius IS NOT NULL;

CREATE INDEX idx_sync_sessions_user_status ON public.sync_sessions(user_id, status);
CREATE INDEX idx_sync_sessions_active ON public.sync_sessions(status, last_activity_at) WHERE status IN ('initiated', 'fetching', 'enriching', 'storing');

-- Row Level Security
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own runs" ON public.runs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own sync sessions" ON public.sync_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_sessions TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.runs IS 'Optimized runs table with structured weather data and analytics-ready schema';
COMMENT ON TABLE public.sync_sessions IS 'Sync session state management for robust, resumable data synchronization';

-- Create utility function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to automatically update updated_at
CREATE TRIGGER update_runs_updated_at BEFORE UPDATE ON public.runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_sessions_updated_at BEFORE UPDATE ON public.sync_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();