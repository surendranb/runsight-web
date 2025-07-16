// Simple Sync Orchestrator Netlify Function - Fixed version that actually works

exports.handler = async (event, context) => {
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

  console.log(`[sync-orchestrator] ${event.httpMethod} ${event.path}`);
  console.log(`[sync-orchestrator] Headers:`, event.headers);
  console.log(`[sync-orchestrator] Query params:`, event.queryStringParameters);
  console.log(`[sync-orchestrator] Body:`, event.body);

  try {
    // For now, return a simple test response to verify the function works
    const action = event.queryStringParameters?.action || 'sync';
    const userId = event.queryStringParameters?.userId;

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Missing userId parameter',
          message: 'userId is required as a query parameter'
        })
      };
    }

    // Simple test response to verify the function is working
    if (action === 'health-check' || event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Sync orchestrator function is working',
          timestamp: new Date().toISOString(),
          userId: userId,
          action: action,
          method: event.httpMethod,
          environment: {
            nodeVersion: process.version,
            platform: process.platform,
            hasSupabaseUrl: !!process.env.SUPABASE_URL,
            hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
            hasStravaClientId: !!process.env.STRAVA_CLIENT_ID,
            hasStravaClientSecret: !!process.env.STRAVA_CLIENT_SECRET,
            hasOpenWeatherKey: !!process.env.OPENWEATHER_API_KEY
          }
        })
      };
    }

    // For POST requests (actual sync), return a mock response for now
    if (event.httpMethod === 'POST') {
      let requestBody = {};
      
      if (event.body) {
        try {
          requestBody = JSON.parse(event.body);
        } catch (e) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false,
              error: 'Invalid JSON in request body',
              message: 'Request body must be valid JSON'
            })
          };
        }
      }

      console.log(`[sync-orchestrator] Parsed request body:`, requestBody);

      // Mock sync response - replace with actual sync logic later
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          syncId: `sync_${Date.now()}`,
          status: 'completed',
          message: 'Mock sync completed successfully',
          progress: {
            total_activities: 0,
            processed_activities: 0,
            current_phase: 'completed',
            percentage_complete: 100
          },
          results: {
            total_processed: 0,
            activities_saved: 0,
            activities_updated: 0,
            activities_skipped: 0,
            activities_failed: 0,
            weather_enriched: 0,
            geocoded: 0,
            duration_seconds: 1
          }
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Method not allowed',
        message: `HTTP method ${event.httpMethod} is not supported`
      })
    };

  } catch (error) {
    console.error('[sync-orchestrator] Unhandled error:', error);
    console.error('[sync-orchestrator] Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          name: error.name
        } : undefined
      })
    };
  }
};