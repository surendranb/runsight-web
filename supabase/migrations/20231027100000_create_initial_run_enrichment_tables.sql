-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Create enriched_runs Table
CREATE TABLE IF NOT EXISTS public.enriched_runs (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    strava_id bigint NOT NULL UNIQUE,
    name text NULL,
    distance real NOT NULL CHECK (distance >= 0),
    moving_time integer NOT NULL CHECK (moving_time >= 0),
    elapsed_time integer NOT NULL CHECK (elapsed_time >= 0),
    total_elevation_gain real CHECK (total_elevation_gain >= 0),
    type text NOT NULL DEFAULT 'Run', -- Assuming 'Run' is a common default
    start_date timestamp with time zone NOT NULL,
    start_date_local timestamp with time zone NOT NULL,
    timezone text,
    utc_offset real,
    start_latlng extensions.geography(Point, 4326),
    end_latlng extensions.geography(Point, 4326),
    location_city text,
    location_state text,
    location_country text,
    achievement_count integer CHECK (achievement_count >= 0),
    kudos_count integer CHECK (kudos_count >= 0),
    comment_count integer CHECK (comment_count >= 0),
    athlete_count integer CHECK (athlete_count >= 0),
    photo_count integer CHECK (photo_count >= 0),
    average_speed real CHECK (average_speed >= 0),
    max_speed real CHECK (max_speed >= 0),
    average_heartrate real CHECK (average_heartrate >= 0),
    max_heartrate real CHECK (max_heartrate >= 0),
    suffer_score real,
    has_heartrate boolean DEFAULT false,
    calories real CHECK (calories >= 0),
    laps jsonb, -- Store lap data as JSON
    splits_metric jsonb, -- Store metric splits
    splits_standard jsonb, -- Store standard splits (miles)
    device_name text,
    gear_id text, -- Could reference a future "gear" table
    external_id text,
    upload_id bigint,
    map_summary_polyline text,
    map_polyline text,
    processed_at timestamp with time zone, -- Timestamp for when this row was last processed/enriched
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),

    CONSTRAINT chk_type CHECK (type IN ('Run', 'VirtualRun', 'TrailRun', 'Treadmill')) -- Add other relevant run types
);

COMMENT ON COLUMN public.enriched_runs.start_latlng IS 'Start point geography (longitude, latitude)';
COMMENT ON COLUMN public.enriched_runs.end_latlng IS 'End point geography (longitude, latitude)';
COMMENT ON COLUMN public.enriched_runs.processed_at IS 'Timestamp for when this row was last processed or significantly updated by enrichment logic';

-- Create run_splits Table
CREATE TABLE IF NOT EXISTS public.run_splits (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    enriched_run_id uuid NOT NULL REFERENCES public.enriched_runs(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- For easier RLS and querying user-specific splits
    strava_id bigint NOT NULL, -- Denormalized from enriched_runs for easier joins from raw activity data if needed

    split_type text NOT NULL, -- e.g., 'metric_km', 'standard_mile', 'lap'
    split_number integer NOT NULL CHECK (split_number > 0), -- 1-based index for the split

    distance real NOT NULL CHECK (distance >= 0),
    elapsed_time integer NOT NULL CHECK (elapsed_time > 0),
    moving_time integer NOT NULL CHECK (moving_time > 0),
    elevation_difference real,
    average_speed real CHECK (average_speed >= 0),
    average_grade_adjusted_speed real, -- Also known as GAP (Grade Adjusted Pace)
    average_heartrate real CHECK (average_heartrate >= 0),
    max_heartrate real CHECK (max_heartrate >= 0),
    pace integer CHECK (pace > 0), -- seconds per km or mile depending on split_type
    grade_adjusted_pace integer, -- seconds per km or mile

    start_index integer, -- Index in original stream data, if applicable
    end_index integer,   -- Index in original stream data, if applicable
    start_time_utc timestamp with time zone NULL,
    end_time_utc timestamp with time zone NULL,

    created_at timestamp with time zone NOT NULL DEFAULT now(),

    UNIQUE (enriched_run_id, split_type, split_number),
    CONSTRAINT chk_split_type CHECK (split_type IN ('metric_km', 'standard_mile', 'lap', 'custom')) -- Add other split types as needed
);

COMMENT ON COLUMN public.run_splits.split_type IS 'Type of split, e.g., metric_km, standard_mile, lap';
COMMENT ON COLUMN public.run_splits.split_number IS '1-based index of the split within its type for a given run';
COMMENT ON COLUMN public.run_splits.pace IS 'Pace in seconds per unit (km for metric_km, mile for standard_mile)';
COMMENT ON COLUMN public.run_splits.grade_adjusted_pace IS 'Grade Adjusted Pace in seconds per unit';
COMMENT ON COLUMN public.run_splits.start_time_utc IS 'Calculated absolute start time of the split in UTC';
COMMENT ON COLUMN public.run_splits.end_time_utc IS 'Calculated absolute end time of the split in UTC';


-- Add Indexes
-- For enriched_runs
CREATE INDEX IF NOT EXISTS idx_enriched_runs_user_id_start_date ON public.enriched_runs(user_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_enriched_runs_strava_id ON public.enriched_runs(strava_id);
CREATE INDEX IF NOT EXISTS idx_enriched_runs_start_latlng_gis ON public.enriched_runs USING GIST (start_latlng);
CREATE INDEX IF NOT EXISTS idx_enriched_runs_end_latlng_gis ON public.enriched_runs USING GIST (end_latlng); -- Added for end_latlng

-- For run_splits
CREATE INDEX IF NOT EXISTS idx_run_splits_enriched_run_id ON public.run_splits(enriched_run_id);
CREATE INDEX IF NOT EXISTS idx_run_splits_user_id ON public.run_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_run_splits_strava_id ON public.run_splits(strava_id); -- Added for denormalized strava_id
CREATE INDEX IF NOT EXISTS idx_run_splits_type_number ON public.run_splits(split_type, split_number); -- For querying specific splits


-- Trigger Function for updated_at on enriched_runs
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to enriched_runs
DROP TRIGGER IF EXISTS on_enriched_runs_updated ON public.enriched_runs; -- Drop if exists to avoid errors on re-run
CREATE TRIGGER on_enriched_runs_updated
  BEFORE UPDATE ON public.enriched_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Note: SECURITY DEFINER for the trigger function might be necessary if RLS is in place
-- and the function needs to operate with higher privileges than the invoking user.
-- If the user updating the row always has permission to modify updated_at, SECURITY INVOKER is safer.
-- For Supabase default RLS on `auth.users`, `SECURITY DEFINER` is often used for such audit triggers
-- if the trigger function is in `public` schema and needs to bypass RLS on `auth.users` (not directly applicable here but good to note).
-- Given this trigger only modifies the table it's on, SECURITY INVOKER should be fine unless specific RLS policies on `enriched_runs` prevent users from updating `updated_at`.
-- Let's stick to SECURITY DEFINER as it's a common pattern for Supabase triggers in examples,
-- but be mindful of its implications. If `auth.users` is referenced, it becomes more critical.
-- For this specific case, where it only does `NEW.updated_at = now()`, INVOKER is generally safer.
-- Changed to DEFINER as per original request, but with a note.

-- It's also good practice to ensure this function is owned by a role that has necessary permissions,
-- often `postgres` or a dedicated service role. Supabase handles this well typically.

-- Add RLS policies (examples, adjust as needed)
-- These are NOT part of the original request but are essential for Supabase security.
-- Consider adding them in a separate migration or here if appropriate.
/*
ALTER TABLE public.enriched_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own enriched runs"
  ON public.enriched_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own enriched runs"
  ON public.enriched_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enriched runs"
  ON public.enriched_runs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own enriched runs"
  ON public.enriched_runs FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own run splits"
  ON public.run_splits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own run splits"
  ON public.run_splits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own run splits"
  ON public.run_splits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own run splits"
  ON public.run_splits FOR DELETE
  USING (auth.uid() = user_id);
*/

-- Grant usage on schema to supabase_auth_admin (or relevant roles) if functions/types are in different schemas
-- GRANT USAGE ON SCHEMA extensions TO supabase_auth_admin; -- Or other roles like anon, authenticated
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated; -- Example
-- GRANT USAGE ON SCHEMA public TO authenticated;

-- Consider sequence ownership if not using uuid_generate_v4, though not applicable here.
-- Example: ALTER SEQUENCE some_sequence OWNED BY table.column;

-- Final check on constraints and defaults
-- All primary keys have defaults.
-- Foreign keys are established.
-- user_id references auth.users.
-- CHECK constraints are in place for non-negative values.
-- created_at and updated_at have defaults.
-- Unique constraints are defined.

-- The schema seems robust based on the requirements.
-- Final file name will be YYYYMMDDHHMMSS_create_initial_run_enrichment_tables.sql
-- Using 20231027100000 as a placeholder timestamp.
