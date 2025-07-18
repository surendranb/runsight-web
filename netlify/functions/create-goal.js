// netlify/functions/create-goal.js - Create a new goal in Supabase
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
    const {
      userId,
      type,
      title,
      description,
      targetValue,
      unit,
      targetDate,
      priority = 'medium',
      category = 'annual',
      createdAt,
      additionalDetails = {}
    } = JSON.parse(event.body);

    // Validate required fields
    if (!userId || !type || !title || !targetValue || !unit || !targetDate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'MISSING_FIELDS',
          message: 'Required fields: userId, type, title, targetValue, unit, targetDate'
        }),
      };
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[create-goal] Missing Supabase configuration');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'CONFIG_ERROR', message: 'Database configuration missing' }),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create the goal
    const goalData = {
      user_id: userId,
      type,
      title,
      description: description || '',
      target_value: targetValue,
      current_value: 0,
      unit,
      target_date: targetDate,
      priority,
      category,
      additional_details: additionalDetails,
      status: 'active'
    };

    // If createdAt is provided (for backdating annual goals), use it
    if (createdAt) {
      goalData.created_at = createdAt;
    }

    const { data: goal, error } = await supabase
      .from('goals')
      .insert([goalData])
      .select()
      .single();

    if (error) {
      console.error('[create-goal] Database error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'DATABASE_ERROR', message: 'Failed to create goal' }),
      };
    }

    console.log(`[create-goal] Created goal "${title}" for user ${userId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        goal: goal,
        message: 'Goal created successfully'
      }),
    };

  } catch (error) {
    console.error('[create-goal] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'Failed to create goal',
        details: error.message
      }),
    };
  }
};