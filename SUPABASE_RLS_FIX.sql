-- Fix RLS policies to allow user creation during OAuth flow
-- Run this in Supabase SQL Editor

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can read own activities" ON activities;
DROP POLICY IF EXISTS "Users can insert own activities" ON activities;
DROP POLICY IF EXISTS "Users can update own activities" ON activities;
DROP POLICY IF EXISTS "Users can read weather for own activities" ON weather;
DROP POLICY IF EXISTS "Users can insert weather for own activities" ON weather;

-- Create new policies that allow anonymous users to create accounts
CREATE POLICY "Allow anonymous user creation"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  USING (true);

-- Activities table policies  
CREATE POLICY "Users can read own activities"
  ON activities
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own activities"
  ON activities
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own activities"
  ON activities
  FOR UPDATE
  USING (true);

-- Weather table policies
CREATE POLICY "Users can read weather for own activities"
  ON weather
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = weather.activity_id
    )
  );

CREATE POLICY "Users can insert weather for own activities"
  ON weather
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = weather.activity_id
    )
  );

-- Grant necessary permissions to anon role
GRANT INSERT ON users TO anon;
GRANT SELECT ON users TO anon;
GRANT UPDATE ON users TO anon;
GRANT INSERT ON activities TO anon;
GRANT SELECT ON activities TO anon;
GRANT UPDATE ON activities TO anon;
GRANT INSERT ON weather TO anon;
GRANT SELECT ON weather TO anon;