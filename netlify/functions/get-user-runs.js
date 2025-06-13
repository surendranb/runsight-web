// netlify/functions/get-user-runs.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*', // Adjust for production
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
      body: JSON.stringify({ error: 'Method not allowed. Please use GET.' }),
    };
  }

  const { VITE_SUPABASE_URL: SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[get-user-runs] Missing Supabase URL or Service Key.');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error: Supabase details not found.' }),
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const userId = event.queryStringParameters?.userId;

  if (!userId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'User ID is required as a query string parameter.' }) };
  }

  console.log(`[get-user-runs] Fetching runs and stats for userId: ${userId}`);

  try {
    // Fetch all runs for the user, ordered by start_date
    const { data: runs, error: fetchRunsError } = await supabase
      .from('runs')
      .select('*') // Select all columns from the 'runs' table
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (fetchRunsError) {
      console.error(`[get-user-runs] Error fetching runs for userId ${userId}:`, fetchRunsError);
      throw new Error(`Failed to fetch runs: ${fetchRunsError.message}`);
    }

    console.log(`[get-user-runs] Successfully fetched ${runs.length} runs for user ${userId}.`);

    // Calculate statistics
    const stats = {
      total_runs: runs.length,
      total_distance: 0, // in meters
      total_moving_time: 0, // in seconds
      average_pace_seconds_per_km: 0,
      average_distance_per_run_meters: 0,
    };

    if (runs.length > 0) {
      stats.total_distance = runs.reduce((sum, run) => sum + (run.distance || 0), 0);
      stats.total_moving_time = runs.reduce((sum, run) => sum + (run.moving_time || 0), 0);

      stats.average_distance_per_run_meters = stats.total_distance / runs.length;

      // Calculate average pace (seconds per kilometer)
      // Only consider runs with valid distance and moving time for pace calculation
      const runsWithValidPaceData = runs.filter(r => r.distance && r.distance > 0 && r.moving_time && r.moving_time > 0);
      if (runsWithValidPaceData.length > 0) {
        const totalPaceSecondsSum = runsWithValidPaceData.reduce((sum, run) => {
          return sum + (run.moving_time / (run.distance / 1000)); // pace in seconds/km for this run
        }, 0);
        stats.average_pace_seconds_per_km = totalPaceSecondsSum / runsWithValidPaceData.length;
      }
    }

    console.log(`[get-user-runs] Calculated stats for user ${userId}:`, stats);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        runs: runs,
        stats: stats, // Ensure client expects this structure
        count: runs.length, // Redundant with stats.total_runs but often useful
      }),
    };

  } catch (error) {
    console.error('[get-user-runs] Critical error in handler for userId', userId, ':', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch user runs and stats', message: error.message }),
    };
  }
};
