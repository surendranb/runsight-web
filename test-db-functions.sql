-- Test script to verify the database functions work correctly
-- Run this in your Supabase SQL editor after applying the migrations

-- Test 1: Check if the UUID generation function works
SELECT generate_strava_user_uuid(12345) as test_uuid;

-- Test 2: Verify the function returns consistent UUIDs
SELECT 
  generate_strava_user_uuid(12345) as uuid1,
  generate_strava_user_uuid(12345) as uuid2,
  generate_strava_user_uuid(12345) = generate_strava_user_uuid(12345) as are_equal;

-- Test 3: Check if RLS policies are in place
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('enriched_runs', 'run_splits');

-- Test 4: Verify table structure
\d public.enriched_runs
\d public.run_splits

-- Test 5: Test a minimal insert (this should work after applying fixes)
-- Note: Replace the user_id with a real UUID if you want to test inserts
/*
INSERT INTO public.enriched_runs (
  user_id,
  strava_id,
  name,
  distance,
  moving_time,
  elapsed_time,
  type,
  start_date,
  start_date_local
) VALUES (
  generate_strava_user_uuid(12345),
  999999999,
  'Test Run',
  5000.0,
  1800,
  1900,
  'Run',
  now(),
  now()
);
*/