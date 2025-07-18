// netlify/functions/delete-goal.js - Delete a goal from Supabase
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'METHOD_NOT_ALLOWED', message: 'Only POST method is allowed' }),
    };
  }

  try {
    const { userId, goalId } = JSON.parse(event.body);

    if (!userId || !goalId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'MISSING_FIELDS',
          message: 'Required fields: userId, goalId'
        }),
      };
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[delete-goal] Missing Supabase configuration');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'CONFIG_ERROR', message: 'Database configuration missing' }),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete the goal (RLS will ensure user can only delete their own goals)
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', userId);

    if (error) {
      console.error('[delete-goal] Database error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'DATABASE_ERROR', message: 'Failed to delete goal' }),
      };
    }

    console.log(`[delete-goal] Deleted goal ${goalId} for user ${userId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Goal deleted successfully'
      }),
    };

  } catch (error) {
    console.error('[delete-goal] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'Failed to delete goal',
        details: error.message
      }),
    };
  }
};