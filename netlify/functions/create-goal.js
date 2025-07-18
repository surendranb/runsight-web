// Create Goal - Netlify Function
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { userId, goalData } = JSON.parse(event.body);

    if (!userId || !goalData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing userId or goalData' }),
      };
    }

    // Validate goal data
    const requiredFields = ['type', 'title', 'targetValue', 'unit', 'targetDate'];
    for (const field of requiredFields) {
      if (!goalData[field]) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Missing required field: ${field}` }),
        };
      }
    }

    // Validate goal type
    if (!['distance', 'pace', 'runs'].includes(goalData.type)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid goal type. Must be distance, pace, or runs' }),
      };
    }

    // Create goal in database
    const { data: goal, error } = await supabase
      .from('goals')
      .insert([{
        user_id: userId,
        type: goalData.type,
        title: goalData.title,
        description: goalData.description || '',
        target_value: goalData.targetValue,
        current_value: 0,
        unit: goalData.unit,
        target_date: goalData.targetDate,
        status: 'active',
        priority: goalData.priority || 'medium',
        category: goalData.category || 'annual',
        additional_details: goalData.additionalDetails || {}
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error creating goal:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create goal', details: error.message }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        goal: {
          id: goal.id,
          userId: goal.user_id,
          type: goal.type,
          title: goal.title,
          description: goal.description,
          targetValue: parseFloat(goal.target_value),
          currentValue: parseFloat(goal.current_value),
          unit: goal.unit,
          targetDate: goal.target_date,
          createdAt: goal.created_at,
          updatedAt: goal.updated_at,
          status: goal.status,
          priority: goal.priority,
          category: goal.category,
          raceDistance: goal.additional_details?.raceDistance,
          timeframe: goal.additional_details?.timeframe
        }
      }),
    };

  } catch (error) {
    console.error('Error creating goal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
};