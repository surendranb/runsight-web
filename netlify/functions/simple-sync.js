// Simple Sync Function - Just make it work!

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  console.log('[simple-sync] Request received:', {
    method: event.httpMethod,
    query: event.queryStringParameters,
    body: event.body
  });

  try {
    // Parse request
    let requestData = {};
    if (event.body) {
      requestData = JSON.parse(event.body);
    }

    const userId = event.queryStringParameters?.userId || requestData.userId;
    
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing userId'
        })
      };
    }

    // Check environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const stravaClientId = process.env.STRAVA_CLIENT_ID;
    const stravaClientSecret = process.env.STRAVA_CLIENT_SECRET;

    console.log('[simple-sync] Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      hasStravaClientId: !!stravaClientId,
      hasStravaClientSecret: !!stravaClientSecret
    });

    // For now, return a working response
    const response = {
      success: true,
      message: 'Sync function is working',
      userId: userId,
      timestamp: new Date().toISOString(),
      environment: {
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseKey,
        hasStravaClientId: !!stravaClientId,
        hasStravaClientSecret: !!stravaClientSecret
      }
    };

    console.log('[simple-sync] Returning response:', response);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('[simple-sync] Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};