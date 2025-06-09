-- Security Test: Verify RLS is working properly
-- Run these tests in Supabase SQL Editor to verify data isolation

-- Test 1: Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'runs';
-- Should show rowsecurity = true

-- Test 2: Check RLS policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'runs';
-- Should show 4 policies (SELECT, INSERT, UPDATE, DELETE)

-- Test 3: Verify permissions are restricted
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'runs' AND table_schema = 'public';
-- Should only show authenticated role, not anon

-- Test 4: Test data isolation (manual test)
-- 1. Create two test users in Supabase Auth
-- 2. Insert runs for each user
-- 3. Verify each user can only see their own runs

-- Example test data (replace with actual user IDs from auth.users):
/*
-- As User 1:
INSERT INTO public.runs (user_id, strava_id, name, distance, moving_time, elapsed_time, start_date, start_date_local)
VALUES ('user-1-uuid', 123456, 'User 1 Run', 5000, 1800, 1800, now(), now());

-- As User 2:
INSERT INTO public.runs (user_id, strava_id, name, distance, moving_time, elapsed_time, start_date, start_date_local)
VALUES ('user-2-uuid', 789012, 'User 2 Run', 3000, 1200, 1200, now(), now());

-- Each user should only see their own run when querying:
SELECT * FROM public.runs; -- Should be filtered by RLS
*/

-- Test 5: Verify auth.uid() function works
SELECT auth.uid() as current_user_id;
-- Should return the current authenticated user's ID