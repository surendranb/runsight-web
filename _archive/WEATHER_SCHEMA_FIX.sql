-- Weather Schema Fix: Make fields nullable to handle API variations
-- Run this in Supabase SQL Editor

-- Make weather fields nullable (in case API doesn't return all fields)
ALTER TABLE weather 
  ALTER COLUMN weather_main DROP NOT NULL,
  ALTER COLUMN weather_description DROP NOT NULL,
  ALTER COLUMN weather_icon DROP NOT NULL,
  ALTER COLUMN visibility DROP NOT NULL,
  ALTER COLUMN wind_speed DROP NOT NULL,
  ALTER COLUMN wind_deg DROP NOT NULL,
  ALTER COLUMN clouds DROP NOT NULL;

-- Add default values for better data consistency
ALTER TABLE weather 
  ALTER COLUMN weather_main SET DEFAULT 'Unknown',
  ALTER COLUMN weather_description SET DEFAULT 'No description available',
  ALTER COLUMN weather_icon SET DEFAULT '01d',
  ALTER COLUMN visibility SET DEFAULT 10000,
  ALTER COLUMN wind_speed SET DEFAULT 0,
  ALTER COLUMN wind_deg SET DEFAULT 0,
  ALTER COLUMN clouds SET DEFAULT 0;

-- Verification query
SELECT column_name, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'weather' 
ORDER BY ordinal_position;