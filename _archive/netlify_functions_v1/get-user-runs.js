// netlify/functions/get-user-runs.js
// Netlify Function: Get user's runs and stats from database (server-side)

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const userId = event.queryStringParameters?.userId;

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Fetch user's runs
    console.log(`Fetching runs for user ${userId}...`);
    const { data: runs, error: fetchRunsError } = await supabase
      .from('runs') // This table is 'enriched_runs' in the migration file, but used as 'runs' elsewhere.
                    // Assuming 'runs' is the correct name as used by save-runs.js and previously by this function.
      .select('*') // This will include splits_metric, splits_standard, laps, strava_data JSONB columns
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (fetchRunsError) {
      console.error(`Error fetching runs for user ${userId}:`, fetchRunsError);
      throw new Error(`Failed to fetch runs: ${fetchRunsError.message}`);
    }
    console.log(`✅ Fetched ${runs.length} runs for user ${userId}`);

    // REMOVED: Fetch user's run_splits logic

    // Calculate statistics (remains the same)
    const stats = {
      total_runs: runs.length,
      total_distance: runs.reduce((sum, run) => sum + (run.distance || 0), 0),
      total_time: runs.reduce((sum, run) => sum + (run.moving_time || 0), 0),
      average_pace: 0,
      average_distance: 0
    };

    if (runs.length > 0) {
      stats.average_distance = stats.total_distance / runs.length;
      const validPaceRuns = runs.filter(r => r.distance && r.moving_time && r.distance > 0);
      const totalPaceSeconds = validPaceRuns.reduce((sum, run) => {
        // pace in seconds per kilometer
        return sum + (run.moving_time / (run.distance / 1000));
      }, 0);

      // Average pace in seconds per kilometer
      stats.average_pace = validPaceRuns.length > 0
                         ? totalPaceSeconds / validPaceRuns.length
                         : 0;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        runs: runs, // Contains all columns from the 'runs' table
        stats: stats,
        // REMOVED: 'splits' array from the top-level response
        count: runs.length
      })
    };

  } catch (error) {
    console.error('Get user runs error:', error); // Updated error message
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch user runs', // Updated error message
        message: error.message
      })
    };
  }
};
