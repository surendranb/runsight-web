// Netlify Function: Save enriched runs to database (server-side)
// This keeps Supabase service key on the server

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

    if (!userId || !activities || !Array.isArray(activities)) {
      throw new Error('User ID and activities array are required');
    }

    const savedRuns = [];
    const skippedRuns = [];

    // Process each activity
    for (const activity of activities) {
      try {
        // Check if run already exists
        const { data: existingRun } = await supabase
          .from('runs')
          .select('id')
          .eq('strava_id', activity.id)
          .eq('user_id', userId)
          .single();

        if (existingRun) {
          console.log(`⏭️ Run ${activity.name} already exists, skipping`);
          skippedRuns.push(activity.id);
          continue;
        }

        // Prepare run data
        const runData = {
          user_id: userId,
          strava_id: activity.id,
          name: activity.name,
          distance: activity.distance,
          moving_time: activity.moving_time,
          elapsed_time: activity.elapsed_time,
          start_date: activity.start_date,
          start_date_local: activity.start_date_local,
          start_latlng: activity.start_latlng ? `(${activity.start_latlng[1]},${activity.start_latlng[0]})` : null,
          end_latlng: activity.end_latlng ? `(${activity.end_latlng[1]},${activity.end_latlng[0]})` : null,
          average_speed: activity.average_speed,
          max_speed: activity.max_speed,
          average_heartrate: activity.average_heartrate,
          max_heartrate: activity.max_heartrate,
          total_elevation_gain: activity.total_elevation_gain,
          weather_data: activity.weather_data,
          strava_data: activity,
        };

        // Insert run into database (server-side with service key)
        const { data: savedRun, error: insertError } = await supabase
          .from('runs')
          .insert(runData)
          .select()
          .single();

        if (insertError) {
          console.error(`❌ Failed to save run ${activity.name}:`, insertError);
          continue;
        }

        console.log(`✅ Saved run: ${activity.name}`);
        savedRuns.push(savedRun);

      } catch (error) {
        console.error(`❌ Error processing activity ${activity.id}:`, error.message);
      }
    }

    console.log(`✅ Processing complete: ${savedRuns.length} saved, ${skippedRuns.length} skipped`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        saved_count: savedRuns.length,
        skipped_count: skippedRuns.length,
        total_processed: activities.length,
        saved_runs: savedRuns.map(run => ({
          id: run.id,
          name: run.name,
          distance: run.distance,
          start_date: run.start_date
        }))
      })
    };

  } catch (error) {
    console.error('Save runs error:', error);
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