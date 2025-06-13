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

          // Add the new geocoding fields
          city: activity.city || null,
          state: activity.state || null,
          country: activity.country || null
        });
      }
    }

    let savedRunsResponse = []; // To store successfully saved run data
    let savedCount = 0;
    let individualSaveFailuresCount = 0;
    // Optional: let individualSaveFailureDetails = [];

    if (activitiesToInsert.length > 0) {
      console.log(`[save-runs] Attempting to batch insert ${activitiesToInsert.length} new runs for user ${userId}.`);
      const { data: batchInsertedRuns, error: batchInsertError } = await supabase
        .from('runs')
        .insert(activitiesToInsert)
        .select();

      if (batchInsertError) {
        console.warn('[save-runs] Batch insert failed:', batchInsertError.message, '- Attempting individual inserts.');
        // Fallback to individual inserts
        for (const activityToInsert of activitiesToInsert) {
          try {
            const { data: individualInsertData, error: individualInsertError } = await supabase
              .from('runs')
              .insert(activityToInsert) // Insert one by one
              .select();

            if (individualInsertError) {
              individualSaveFailuresCount++;
              // Optional: individualSaveFailureDetails.push({ strava_id: activityToInsert.strava_id, error: individualInsertError.message });
              console.error(`[save-runs] Failed to insert activity ${activityToInsert.strava_id} individually:`, individualInsertError.message);
            } else {
              if (individualInsertData && individualInsertData.length > 0) {
                savedRunsResponse.push(...individualInsertData); // Add successfully saved run
                savedCount++;
              } else {
                // This case should ideally not happen if insert didn't error but returned no data
                individualSaveFailuresCount++;
                console.error(`[save-runs] Failed to insert activity ${activityToInsert.strava_id} individually: No data returned despite no error.`);
              }
            }
          } catch (individualCatchError) {
            // Catch any unexpected error during the individual insert attempt itself
            individualSaveFailuresCount++;
            console.error(`[save-runs] Unexpected error inserting activity ${activityToInsert.strava_id} individually:`, individualCatchError.message);
          }
        }
        if (savedCount > 0) {
            console.log(`[save-runs] ✅ Individual inserts completed. Saved ${savedCount} runs, ${individualSaveFailuresCount} failures.`);
        } else {
            console.warn(`[save-runs] ⚠️ Individual inserts completed. No runs saved. ${individualSaveFailuresCount} failures.`);
        }
      } else {
        // Batch insert was successful
        savedRunsResponse = batchInsertedRuns || [];
        savedCount = savedRunsResponse.length;
        console.log(`[save-runs] ✅ Batch insert successful. Saved ${savedCount} runs.`);
      }
    } else {
      console.log(`[save-runs] No new runs to insert for user ${userId}.`);
    }

    // Update the response body
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        saved_count: savedCount,
        skipped_count: skippedCount, // This is from pre-existing check, remains the same
        individual_save_failures_count: individualSaveFailuresCount, // New field
        // Optional: individual_save_failure_details: individualSaveFailureDetails,
        total_processed_for_db: activitiesToInsert.length, // How many were attempted for DB insert
        message: `Saved ${savedCount} runs. Skipped ${skippedCount} already existing. Failed to save ${individualSaveFailuresCount} runs during DB operation.`
        // saved_runs detail can be simplified or kept as is
        // saved_runs: savedRunsResponse.map(run => ({ id: run.id, strava_id: run.strava_id, name: run.name }))
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
// Re-committing to ensure visibility of batch insert fix.
