// netlify/functions/sync-data.js - Simple sync function for single user
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
      body: JSON.stringify({ 
        error: 'METHOD_NOT_ALLOWED', 
        message: 'Only POST method is allowed' 
      }),
    };
  }

  console.log('[sync-data] Starting sync process...');

  try {
    // Parse request body
    let requestData = {};
    if (event.body) {
      try {
        requestData = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'INVALID_JSON',
            message: 'Request body must be valid JSON'
          })
        };
      }
    }

    const stravaUserId = requestData.userId || event.queryStringParameters?.userId;
    
    if (!stravaUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'MISSING_USER_ID',
          message: 'userId is required in request body or query parameters'
        })
      };
    }

    // Environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'CONFIG_ERROR',
          message: 'Supabase environment variables not configured'
        })
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's Strava tokens from user_tokens table
    console.log(`[sync-data] Looking up tokens for Strava user ${stravaUserId}...`);
    const { data: userTokens, error: tokenError } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('strava_user_id', stravaUserId)
      .single();

    if (tokenError || !userTokens) {
      console.error('[sync-data] User tokens not found:', tokenError);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'AUTH_REQUIRED',
          message: 'User not found or not authenticated with Strava. Please re-authenticate.',
          details: tokenError?.message
        })
      };
    }

    // Check if token is expired and refresh if needed
    const now = Math.floor(Date.now() / 1000);
    let accessToken = userTokens.strava_access_token;

    if (userTokens.strava_expires_at <= now) {
      console.log('[sync-data] Access token expired, refreshing...');
      
      const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.VITE_STRAVA_CLIENT_ID,
          client_secret: process.env.VITE_STRAVA_CLIENT_SECRET,
          refresh_token: userTokens.strava_refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        console.error('[sync-data] Token refresh failed:', refreshResponse.status);
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            error: 'TOKEN_REFRESH_FAILED',
            message: 'Failed to refresh Strava token. Please re-authenticate with Strava.'
          })
        };
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update tokens in database
      await supabase
        .from('user_tokens')
        .update({
          strava_access_token: refreshData.access_token,
          strava_refresh_token: refreshData.refresh_token,
          strava_expires_at: refreshData.expires_at,
          updated_at: new Date().toISOString()
        })
        .eq('strava_user_id', stravaUserId);

      console.log('[sync-data] Tokens refreshed successfully');
    }

    // Fetch activities from Strava
    const timeRange = requestData.timeRange || {};
    let stravaUrl = 'https://www.strava.com/api/v3/athlete/activities?per_page=50';
    
    if (timeRange.after) {
      stravaUrl += `&after=${timeRange.after}`;
    }
    if (timeRange.before) {
      stravaUrl += `&before=${timeRange.before}`;
    }

    console.log(`[sync-data] Fetching activities from Strava: ${stravaUrl}`);
    const stravaResponse = await fetch(stravaUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!stravaResponse.ok) {
      console.error('[sync-data] Strava API error:', stravaResponse.status);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'STRAVA_API_ERROR',
          message: stravaResponse.status === 401 ? 'Strava token expired' : 'Failed to fetch activities from Strava'
        })
      };
    }

    const activities = await stravaResponse.json();
    const runningActivities = activities.filter(activity => 
      activity.type === 'Run' || activity.sport_type === 'Run'
    );

    console.log(`[sync-data] Found ${runningActivities.length} running activities`);

    // Prepare all run data for batch upsert
    const runDataArray = runningActivities.map(activity => ({
      strava_id: activity.id,
      name: activity.name,
      distance_meters: activity.distance,
      moving_time_seconds: activity.moving_time,
      elapsed_time_seconds: activity.elapsed_time,
      start_date: activity.start_date,
      start_date_local: activity.start_date_local,
      start_latitude: activity.start_latlng ? activity.start_latlng[0] : null,
      start_longitude: activity.start_latlng ? activity.start_latlng[1] : null,
      end_latitude: activity.end_latlng ? activity.end_latlng[0] : null,
      end_longitude: activity.end_latlng ? activity.end_latlng[1] : null,
      average_speed_ms: activity.average_speed,
      max_speed_ms: activity.max_speed,
      // Convert heart rate values to integers (round decimal values)
      average_heartrate_bpm: activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
      max_heartrate_bpm: activity.max_heartrate ? Math.round(activity.max_heartrate) : null,
      total_elevation_gain_meters: activity.total_elevation_gain,
      activity_type: activity.type || activity.sport_type || 'Run',
      strava_data: activity,
      updated_at: new Date().toISOString()
    }));

    // Batch upsert all activities at once
    console.log(`[sync-data] Batch upserting ${runDataArray.length} runs...`);
    console.log(`[sync-data] Sample run data:`, JSON.stringify(runDataArray[0], null, 2));
    
    const { data: upsertedData, error: upsertError } = await supabase
      .from('runs')
      .upsert(runDataArray, { 
        onConflict: 'strava_id',
        ignoreDuplicates: false
      })
      .select('strava_id');

    let processedCount = 0;
    let failedCount = 0;

    console.log(`[sync-data] Upsert result:`, {
      upsertedData: upsertedData ? upsertedData.length : 'null',
      upsertError: upsertError ? upsertError.message : 'none'
    });

    if (upsertError) {
      console.error('[sync-data] Batch upsert error:', JSON.stringify(upsertError, null, 2));
      failedCount = runDataArray.length;
    } else {
      processedCount = upsertedData ? upsertedData.length : runDataArray.length;
      console.log(`[sync-data] Successfully upserted ${processedCount} runs`);
    }

    const results = {
      success: true,
      message: 'Sync completed successfully',
      timestamp: new Date().toISOString(),
      status: 'completed',
      results: {
        total_processed: runningActivities.length,
        activities_saved: processedCount, // All successful upserts
        activities_updated: 0, // We don't distinguish between insert/update with upsert
        activities_skipped: 0, // No skipping with upsert
        activities_failed: failedCount,
        weather_enriched: 0,
        geocoded: 0,
        duration_seconds: 1
      }
    };

    console.log('[sync-data] Sync completed:', results);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results)
    };

  } catch (error) {
    console.error('[sync-data] Critical error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'Sync failed due to an unexpected server error',
        details: error.message
      })
    };
  }
};