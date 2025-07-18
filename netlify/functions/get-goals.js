// netlify/functions/get-goals.js - Get user goals from Supabase
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
      body: JSON.stringify({ error: 'METHOD_NOT_ALLOWED', message: 'Only GET method is allowed' }),
    };
  }

  try {
    const { userId } = event.queryStringParameters || {};

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'MISSING_USER_ID', message: 'User ID is required' }),
      };
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[get-goals] Missing Supabase configuration');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'CONFIG_ERROR', message: 'Database configuration missing' }),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user goals
    const { data: goals, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[get-goals] Database error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'DATABASE_ERROR', message: 'Failed to fetch goals' }),
      };
    }

    console.log(`[get-goals] Found ${goals?.length || 0} goals for user ${userId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        goals: goals || [],
        count: goals?.length || 0
      }),
    };

  } catch (error) {
    console.error('[get-goals] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch goals',
        details: error.message
      }),
    };
  }
};