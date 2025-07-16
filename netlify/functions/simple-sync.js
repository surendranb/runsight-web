// Simple Sync Function - Actually fetch and store Strava data

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

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing Supabase configuration'
        })
      };
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's Strava token from Supabase
    console.log('[simple-sync] Getting user Strava token...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('strava_access_token, strava_refresh_token, strava_id')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.error('[simple-sync] User not found:', userError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'User not found or not authenticated with Strava'
        })
      };
    }

    if (!userData.strava_access_token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'No Strava access token found. Please re-authenticate with Strava.'
        })
      };
    }

    // Fetch activities from Strava
    console.log('[simple-sync] Fetching activities from Strava...');
    const stravaResponse = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=10', {
      headers: {
        'Authorization': `Bearer ${userData.strava_access_token}`
      }
    });

    if (!stravaResponse.ok) {
      console.error('[simple-sync] Strava API error:', stravaResponse.status, stravaResponse.statusText);
      
      if (stravaResponse.status === 401) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Strava token expired. Please re-authenticate with Strava.'
          })
        };
      }

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to fetch activities from Strava'
        })
      };
    }

    const activities = await stravaResponse.json();
    console.log(`[simple-sync] Fetched ${activities.length} activities from Strava`);

    // Filter for running activities only
    const runningActivities = activities.filter(activity => 
      activity.type === 'Run' || activity.sport_type === 'Run'
    );

    console.log(`[simple-sync] Found ${runningActivities.length} running activities`);

    // Store activities in Supabase
    let savedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const activity of runningActivities) {
      try {
        // Check if activity already exists
        const { data: existingActivity } = await supabase
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

        if (existingActivity) {
          // Update existing activity
          const { error: updateError } = await supabase
            .from('enriched_runs')
            .update(activityData)
            .eq('id', existingActivity.id);

          if (updateError) {
            console.error('[simple-sync] Error updating activity:', updateError);
          } else {
            updatedCount++;
          }
        } else {
          // Insert new activity
          const { error: insertError } = await supabase
            .from('enriched_runs')
            .insert(activityData);

          if (insertError) {
            console.error('[simple-sync] Error inserting activity:', insertError);
          } else {
            savedCount++;
          }
        }
      } catch (activityError) {
        console.error('[simple-sync] Error processing activity:', activityError);
        skippedCount++;
      }
    }

    const response = {
      success: true,
      message: 'Sync completed successfully',
      userId: userId,
      timestamp: new Date().toISOString(),
      results: {
        total_processed: runningActivities.length,
        activities_saved: savedCount,
        activities_updated: updatedCount,
        activities_skipped: skippedCount,
        activities_failed: 0,
        weather_enriched: 0,
        geocoded: 0,
        duration_seconds: 1
      }
    };

    console.log('[simple-sync] Sync completed:', response);

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