-- COMPLETE RLS FIX FOR ALL TABLES
-- Run this in Supabase SQL Editor

-- 1. Drop all existing restrictive policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can read own activities" ON activities;
DROP POLICY IF EXISTS "Users can insert own activities" ON activities;
DROP POLICY IF EXISTS "Users can update own activities" ON activities;
DROP POLICY IF EXISTS "Users can read weather for own activities" ON weather;
DROP POLICY IF EXISTS "Users can insert weather for own activities" ON weather;

-- 2. Create permissive policies for USERS table
CREATE POLICY "Allow all operations on users"
  ON users
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Create permissive policies for ACTIVITIES table  
CREATE POLICY "Allow all operations on activities"
  ON activities
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Create permissive policies for WEATHER table
CREATE POLICY "Allow all operations on weather"
  ON weather
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Grant all necessary permissions to anon role
GRANT ALL ON users TO anon;
GRANT ALL ON activities TO anon;
GRANT ALL ON weather TO anon;

-- 6. Grant all necessary permissions to authenticated role
GRANT ALL ON users TO authenticated;
GRANT ALL ON activities TO authenticated;
GRANT ALL ON weather TO authenticated;

-- 7. Ensure RLS is enabled but permissive
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather ENABLE ROW LEVEL SECURITY;

-- Verification queries (run these to check)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('users', 'activities', 'weather');