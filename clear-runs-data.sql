-- Clear existing runs data to allow fresh sync with weather enrichment
-- This will remove all existing run data so you can sync fresh with weather data

-- Clear all runs data
DELETE FROM public.runs;

-- Reset any sequences (if needed)
-- Note: Since we use UUID primary keys, no sequence reset needed

-- Verify tables are empty
SELECT 'runs' as table_name, COUNT(*) as record_count FROM public.runs
UNION ALL
SELECT 'user_tokens' as table_name, COUNT(*) as record_count FROM public.user_tokens;

-- Show table structure to confirm weather_data column exists
\d public.runs;

COMMENT ON SCRIPT IS 'Clears all run data to enable fresh sync with weather enrichment';