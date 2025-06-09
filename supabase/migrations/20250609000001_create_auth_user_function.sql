-- Simplified approach: Create a function to generate a deterministic UUID for Strava users
-- This allows us to have consistent user IDs without complex auth setup

CREATE OR REPLACE FUNCTION public.generate_strava_user_uuid(strava_id bigint)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 
    'strava_user_' || strava_id::text
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.generate_strava_user_uuid TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_strava_user_uuid TO anon;