// netlify/functions/save-runs.js
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
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { userId, activities } = JSON.parse(event.body);

    if (!userId || !activities || !Array.isArray(activities) || activities.length === 0) {
      // If no activities, return early
      return {
        statusCode: 200, // Or 400 if activities array is required to be non-empty
        headers,
        body: JSON.stringify({
          success: true,
          saved_count: 0,
          skipped_count: 0,
          total_processed: 0,
          message: activities && activities.length === 0 ? "No activities to process." : "User ID and activities array are required."
        })
      };
    }

    const incomingStravaIds = activities.map(act => act.id);

    // Fetch existing runs in a single query
    const { data: existingRunsData, error: fetchExistingError } = await supabase
      .from('runs')
      .select('strava_id')
      .eq('user_id', userId)
      .in('strava_id', incomingStravaIds);

    if (fetchExistingError) {
      console.error('Error fetching existing runs:', fetchExistingError);
      throw new Error(`Failed to check for existing runs: ${fetchExistingError.message}`);
    }

    const existingStravaIds = new Set(existingRunsData.map(run => run.strava_id));
    const activitiesToInsert = [];
    let skippedCount = 0;

    for (const activity of activities) {
      if (existingStravaIds.has(activity.id)) {
        skippedCount++;
      } else {
        // Prepare run data for new activities
        activitiesToInsert.push({
          user_id: userId,
          strava_id: activity.id, // This is typically the Strava activity ID
          name: activity.name,
          distance: activity.distance,
          moving_time: activity.moving_time,
          elapsed_time: activity.elapsed_time,
          start_date: activity.start_date,
          start_date_local: activity.start_date_local,
          // Ensure latlng data is correctly formatted if your DB expects specific PostGIS types or arrays
          start_latlng: activity.start_latlng ? `(${activity.start_latlng[1]},${activity.start_latlng[0]})` : null,
          end_latlng: activity.end_latlng ? `(${activity.end_latlng[1]},${activity.end_latlng[0]})` : null,
          average_speed: activity.average_speed,
          max_speed: activity.max_speed,
          average_heartrate: activity.average_heartrate,
          max_heartrate: activity.max_heartrate,
          total_elevation_gain: activity.total_elevation_gain,
          weather_data: activity.weather_data, // Assuming this is a JSON object
          strava_data: activity, // Store the whole activity object as JSON
        });
      }
    }

    let savedRunsResponse = [];
    let savedCount = 0;

    if (activitiesToInsert.length > 0) {
      console.log(`[save-runs] Attempting to batch insert ${activitiesToInsert.length} new runs for user ${userId}.`);
      const { data: insertedRuns, error: insertError } = await supabase
        .from('runs')
        .insert(activitiesToInsert)
        .select(); // Select the inserted rows

      if (insertError) {
        console.error('Error batch inserting runs:', insertError);
        // Decide if partial success is acceptable or throw error for the whole batch
        // For simplicity here, we'll throw, but you might want more granular error handling
        throw new Error(`Batch insert failed: ${insertError.message}`);
      }
      savedRunsResponse = insertedRuns || [];
      savedCount = savedRunsResponse.length;
      console.log(`[save-runs] ✅ Batch insert successful. Saved ${savedCount} runs.`);
    } else {
      console.log(`[save-runs] No new runs to insert for user ${userId}.`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        saved_count: savedCount,
        skipped_count: skippedCount,
        total_processed: activities.length,
        // The 'saved_runs' detail might be less relevant now or could be simplified
        // as we don't have individual save results in the same way.
        // For now, returning the saved runs from the batch insert.
        saved_runs: savedRunsResponse.map(run => ({
            id: run.id, // Supabase ID
            strava_id: run.strava_id, // Strava ID
            name: run.name
        }))
      })
    };

  } catch (error) {
    console.error('[save-runs] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to save runs',
        message: error.message 
      })
    };
  }
};