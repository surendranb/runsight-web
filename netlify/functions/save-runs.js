// netlify/functions/save-runs.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*', // Adjust for production
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
      body: JSON.stringify({ error: 'Method not allowed. Please use POST.' }),
    };
  }

  const { VITE_SUPABASE_URL: SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[save-runs] Missing Supabase URL or Service Key.');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error: Supabase details not found.' }),
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const { userId, activities } = JSON.parse(event.body);

    if (!userId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'User ID is required.' }) };
    }
    if (!activities || !Array.isArray(activities)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Activities array is required.' }) };
    }

    if (activities.length === 0) {
      console.log('[save-runs] No activities provided to save.');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          saved_count: 0,
          skipped_count: 0,
          individual_save_failures_count: 0,
          total_processed_for_db: 0,
          message: "No activities to process."
        }),
      };
    }

    console.log(`[save-runs] Received ${activities.length} activities for userId: ${userId}.`);

    const incomingStravaIds = activities.map(act => act.id);
    let existingStravaIds = new Set();

    if (incomingStravaIds.length > 0) {
        const { data: existingRunsData, error: fetchExistingError } = await supabase
          .from('runs')
          .select('strava_id')
          .eq('user_id', userId)
          .in('strava_id', incomingStravaIds);

        if (fetchExistingError) {
          console.error('[save-runs] Error fetching existing runs:', fetchExistingError);
          // Depending on policy, you might allow proceeding or return an error
          // For now, let's throw, as this is a critical check to avoid duplicates properly
          throw new Error(`Failed to check for existing runs: ${fetchExistingError.message}`);
        }
        existingStravaIds = new Set(existingRunsData.map(run => run.strava_id));
        console.log(`[save-runs] Found ${existingStravaIds.size} existing runs among the provided activities for user ${userId}.`);
    }


    const activitiesToInsert = [];
    let skippedCount = 0;

    for (const activity of activities) {
      // Ensure activity and activity.id are valid before attempting to access activity.id
      if (!activity || typeof activity.id === 'undefined') {
          console.warn('[save-runs] Skipping an invalid activity object (missing id):', activity);
          // Decide how to count this - perhaps a new counter for "malformed_activities_skipped"
          // For now, it won't be added to activitiesToInsert nor increment skippedCount for existing.
          continue;
      }

      if (existingStravaIds.has(activity.id)) {
        skippedCount++;
      } else {
        // Prepare run data for new activities
        // Ensure all fields are correctly mapped and handle potential nulls from enrichment
        const weatherData = activity.weather_data || {}; // Default to empty object if null/undefined

        activitiesToInsert.push({
          user_id: userId,
          strava_id: activity.id,
          name: activity.name || 'Unnamed Run',
          distance: activity.distance || 0,
          moving_time: activity.moving_time || 0,
          elapsed_time: activity.elapsed_time || 0,
          start_date: activity.start_date, // Assuming this is always present and valid ISO string
          start_date_local: activity.start_date_local, // Assuming this is always present
          start_latlng: activity.start_latlng ? `(${activity.start_latlng[1]},${activity.start_latlng[0]})` : null, // Swapped order for PostGIS point
          end_latlng: activity.end_latlng ? `(${activity.end_latlng[1]},${activity.end_latlng[0]})` : null, // Swapped order for PostGIS point
          average_speed: activity.average_speed || 0,
          max_speed: activity.max_speed || 0,
          average_heartrate: activity.average_heartrate || null,
          max_heartrate: activity.max_heartrate || null,
          total_elevation_gain: activity.total_elevation_gain || 0,
          weather_data: activity.weather_data, // Store the whole enriched weather object (or null)
          strava_data: activity.strava_data || activity, // Store the original Strava activity, or the activity itself if strava_data field is missing
          city: activity.city || null,
          state: activity.state || null,
          country: activity.country || null,
          // created_at and updated_at will be handled by db defaults or triggers if set up
        });
      }
    }

    console.log(`[save-runs] Prepared ${activitiesToInsert.length} new activities for insertion. Skipped ${skippedCount} existing activities.`);

    let savedRunsData = []; // To store data of successfully saved runs (e.g., IDs)
    let savedCount = 0;
    let individualSaveFailuresCount = 0;

    if (activitiesToInsert.length > 0) {
      console.log(`[save-runs] Attempting to batch insert ${activitiesToInsert.length} new runs for user ${userId}.`);
      const { data: batchInsertedRuns, error: batchInsertError } = await supabase
        .from('runs')
        .insert(activitiesToInsert)
        .select('id, strava_id, name'); // Select only minimal data

      if (batchInsertError) {
        console.warn('[save-runs] Batch insert failed:', batchInsertError.message, '- Attempting individual inserts.');
        for (const activityToSave of activitiesToInsert) {
          try {
            const { data: individualInsertData, error: individualInsertError } = await supabase
              .from('runs')
              .insert(activityToSave)
              .select('id, strava_id, name');

            if (individualInsertError) {
              individualSaveFailuresCount++;
              console.error(`[save-runs] Failed to insert activity ${activityToSave.strava_id} individually:`, individualInsertError.message);
            } else {
              if (individualInsertData && individualInsertData.length > 0) {
                savedRunsData.push(...individualInsertData);
                savedCount++;
              } else {
                individualSaveFailuresCount++; // Should not happen if no error, but good to count
                console.error(`[save-runs] Insert for activity ${activityToSave.strava_id} returned no error but no data.`);
              }
            }
          } catch (indCatchError) {
             individualSaveFailuresCount++;
             console.error(`[save-runs] Critical error during individual insert for activity ${activityToSave.strava_id}:`, indCatchError.message);
          }
        }
        if (savedCount > 0) {
            console.log(`[save-runs] ✅ Individual inserts partially successful. Saved ${savedCount} runs, ${individualSaveFailuresCount} failures.`);
        } else {
            console.warn(`[save-runs] ⚠️ Individual inserts failed for all ${individualSaveFailuresCount} remaining runs.`);
        }
      } else {
        savedRunsData = batchInsertedRuns || [];
        savedCount = savedRunsData.length;
        console.log(`[save-runs] ✅ Batch insert successful. Saved ${savedCount} runs.`);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        saved_count: savedCount,
        skipped_count: skippedCount,
        individual_save_failures_count: individualSaveFailuresCount,
        total_processed_for_db: activitiesToInsert.length,
        message: `Saved ${savedCount} new runs. Skipped ${skippedCount} (already existing). Failed to save ${individualSaveFailuresCount} runs during DB operation.`,
        // saved_runs_details: savedRunsData // Optionally return details of saved runs
      }),
    };

  } catch (error) {
    console.error('[save-runs] Critical error in handler:', error);
    if (error instanceof SyntaxError && error.message.includes("JSON.parse")) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid request body: Not valid JSON."}) };
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to save runs due to an unexpected server error', message: error.message }),
    };
  }
};
