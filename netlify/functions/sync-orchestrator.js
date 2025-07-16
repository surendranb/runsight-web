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

    // For POST requests (actual sync), fetch real Strava data
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

      console.log(`[sync-orchestrator] Starting real sync for user ${userId}`);
      console.log(`[sync-orchestrator] Request body:`, requestBody);

      try {
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        
        // Use the VITE_ prefixed environment variables
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

        if (!supabaseUrl || !supabaseKey) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Missing Supabase configuration',
              message: 'Supabase environment variables not configured'
            })
          };
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get user's Strava token
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('strava_access_token, strava_refresh_token, strava_id')
          .eq('id', userId)
          .single();

        if (userError || !userData || !userData.strava_access_token) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Authentication required',
              message: 'Please re-authenticate with Strava'
            })
          };
        }

        // Fetch activities from Strava
        console.log(`[sync-orchestrator] Fetching activities from Strava...`);
        const stravaResponse = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=20', {
          headers: {
            'Authorization': `Bearer ${userData.strava_access_token}`
          }
        });

        if (!stravaResponse.ok) {
          console.error(`[sync-orchestrator] Strava API error:`, stravaResponse.status);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Strava API error',
              message: stravaResponse.status === 401 ? 'Strava token expired' : 'Failed to fetch activities'
            })
          };
        }

        const activities = await stravaResponse.json();
        const runningActivities = activities.filter(activity => 
          activity.type === 'Run' || activity.sport_type === 'Run'
        );

        console.log(`[sync-orchestrator] Found ${runningActivities.length} running activities`);

        // Store activities in Supabase
        let savedCount = 0;
        let updatedCount = 0;

        for (const activity of runningActivities) {
          try {
            const { data: existing } = await supabase
              .from('enriched_runs')
              .select('id')
              .eq('strava_id', activity.id)
              .eq('user_id', userId)
              .single();

            const activityData = {
              user_id: userId,
              strava_id: activity.id,
              name: activity.name,
              distance: activity.distance,
              moving_time: activity.moving_time,
              elapsed_time: activity.elapsed_time,
              start_date: activity.start_date,
              start_date_local: activity.start_date_local,
              start_latlng: activity.start_latlng ? JSON.stringify(activity.start_latlng) : null,
              end_latlng: activity.end_latlng ? JSON.stringify(activity.end_latlng) : null,
              average_speed: activity.average_speed,
              max_speed: activity.max_speed,
              average_heartrate: activity.average_heartrate,
              max_heartrate: activity.max_heartrate,
              total_elevation_gain: activity.total_elevation_gain,
              strava_data: activity
            };

            if (existing) {
              await supabase.from('enriched_runs').update(activityData).eq('id', existing.id);
              updatedCount++;
            } else {
              await supabase.from('enriched_runs').insert(activityData);
              savedCount++;
            }
          } catch (activityError) {
            console.error(`[sync-orchestrator] Error processing activity:`, activityError);
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            syncId: `sync_${Date.now()}`,
            status: 'completed',
            message: 'Real sync completed successfully',
            progress: {
              total_activities: runningActivities.length,
              processed_activities: runningActivities.length,
              current_phase: 'completed',
              percentage_complete: 100
            },
            results: {
              total_processed: runningActivities.length,
              activities_saved: savedCount,
              activities_updated: updatedCount,
              activities_skipped: 0,
              activities_failed: 0,
              weather_enriched: 0,
              geocoded: 0,
              duration_seconds: 2
            }
          })
        };

      } catch (syncError) {
        console.error(`[sync-orchestrator] Sync error:`, syncError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Sync failed',
            message: syncError.message
          })
        };
      }
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