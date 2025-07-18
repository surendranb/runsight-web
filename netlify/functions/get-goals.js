// Get Goals - Netlify Function
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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const userId = event.queryStringParameters?.userId;

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing userId parameter' }),
      };
    }

    // Get goals from database
    const { data: goals, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error fetching goals:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch goals', details: error.message }),
      };
    }

    // Transform goals to match frontend interface
    const transformedGoals = goals.map(goal => ({
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
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        goals: transformedGoals
      }),
    };

  } catch (error) {
    console.error('Error fetching goals:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
};