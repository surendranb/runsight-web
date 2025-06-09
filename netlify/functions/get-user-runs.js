// Netlify Function: Get user's runs from database (server-side)
// This keeps database access on the server

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
    const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get user ID from query parameters
    const userId = event.queryStringParameters?.userId;

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Fetch user's runs from database (server-side with service key)
    const { data: runs, error: fetchError } = await supabase
      .from('runs')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch runs: ${fetchError.message}`);
    }

    console.log(`✅ Fetched ${runs.length} runs for user ${userId}`);

    // Calculate statistics
    const stats = {
      total_runs: runs.length,
      total_distance: runs.reduce((sum, run) => sum + (run.distance || 0), 0),
      total_time: runs.reduce((sum, run) => sum + (run.moving_time || 0), 0),
      average_pace: 0,
      average_distance: 0
    };

    if (runs.length > 0) {
      stats.average_distance = stats.total_distance / runs.length;
      const totalPace = runs.reduce((sum, run) => {
        if (run.distance && run.moving_time) {
          return sum + (run.moving_time / (run.distance / 1000));
        }
        return sum;
      }, 0);
      stats.average_pace = totalPace / runs.length;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        runs: runs,
        stats: stats,
        count: runs.length
      })
    };

  } catch (error) {
    console.error('Get user runs error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch user runs',
        message: error.message 
      })
    };
  }
};