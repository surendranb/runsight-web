import { supabase } from './supabase';
import { StravaDetailedActivity, User as AuthUser } from '../types'; // Assuming User is from ../types for auth.users
import { fetchDetailedStravaActivity } from './strava';
import { fetchReverseGeocodeData, GeocodeLocationInfo } from './location';
import { fetchWeatherData, EnrichedWeatherInfo } from './weather';

// It's good practice to define a type for the enriched run data, even if partial,
// matching your Supabase table structure. For now, we'll build it dynamically.
// type EnrichedRunInsert = Partial<YourEnrichedRunTableType>;
// type RunSplitInsert = Partial<YourRunSplitTableType>;

export interface ProcessActivityResult {
  enrichedRunId: string | null;
  wasSkipped?: boolean;
  error?: any;
}

export const processAndSaveActivity = async (
  stravaActivityId: number,
  userId: string, // This should be the UUID from your auth.users table
  stravaAccessToken: string
): Promise<ProcessActivityResult> => {
  console.log(`[ActivityProcessor] Starting processing for Strava Activity ID: ${stravaActivityId}, User ID: ${userId}`);

  try {
    // Step 1: Fetch Detailed Strava Activity
    console.log(`[ActivityProcessor] Fetching detailed activity from Strava: ${stravaActivityId}`);
    const detailedActivity: StravaDetailedActivity | null = await fetchDetailedStravaActivity(
      stravaActivityId.toString(), // fetchDetailedStravaActivity expects string ID
      stravaAccessToken
    );

    if (!detailedActivity) {
      console.error(`[ActivityProcessor] Failed to fetch detailed activity ${stravaActivityId} from Strava.`);
      return { enrichedRunId: null, error: new Error(`Failed to fetch detailed activity ${stravaActivityId} from Strava.`) };
    }
    console.log(`[ActivityProcessor] Successfully fetched detailed activity: ${detailedActivity.name}`);

    // Step 2: Check for Existing Record (Simplified)
    console.log(`[ActivityProcessor] Checking for existing enriched run for Strava ID: ${detailedActivity.id}`);
    const { data: existingRun, error: existingError } = await supabase
      .from('enriched_runs')
      .select('id')
      .eq('strava_id', detailedActivity.id)
      .maybeSingle();

    if (existingError) {
      console.error(`[ActivityProcessor] Error checking for existing run for Strava ID ${detailedActivity.id}:`, existingError);
      // Don't immediately fail; perhaps it's a temporary issue. Proceed with caution or implement retry.
      // For now, we'll throw to be caught by the main try-catch.
      throw new Error(`Error checking for existing run: ${existingError.message}`);
    }

    if (existingRun) {
      console.log(`[ActivityProcessor] Activity ${detailedActivity.id} (Enriched ID: ${existingRun.id}) already processed. Skipping.`);
      return { enrichedRunId: existingRun.id, wasSkipped: true }; // Add wasSkipped
    }
    console.log(`[ActivityProcessor] No existing enriched run found for Strava ID: ${detailedActivity.id}. Proceeding with enrichment.`);

    // Step 3: Initialize enrichedRunData
    // Ensure field names match your 'enriched_runs' table schema
    const enrichedRunData: Record<string, any> = {
      user_id: userId,
      strava_id: detailedActivity.id,
      name: detailedActivity.name,
      distance: detailedActivity.distance,
      moving_time: detailedActivity.moving_time,
      elapsed_time: detailedActivity.elapsed_time,
      total_elevation_gain: detailedActivity.total_elevation_gain,
      type: detailedActivity.type, // Ensure this matches ENUM or CHECK constraint if any
      start_date: detailedActivity.start_date, // ISO 8601 string
      start_date_local: detailedActivity.start_date_local, // ISO 8601 string
      timezone: detailedActivity.timezone,
      utc_offset: detailedActivity.utc_offset,
      achievement_count: detailedActivity.achievement_count,
      kudos_count: detailedActivity.kudos_count,
      comment_count: detailedActivity.comment_count,
      athlete_count: detailedActivity.athlete_count, // Strava's athlete_count
      photo_count: detailedActivity.photo_count,
      map_summary_polyline: detailedActivity.map?.summary_polyline,
      map_polyline: detailedActivity.map?.polyline, // Detailed polyline
      // visibility: detailedActivity.visibility, // REMOVED as per request
      average_speed: detailedActivity.average_speed,
      max_speed: detailedActivity.max_speed,
      has_heartrate: detailedActivity.has_heartrate,
      average_heartrate: detailedActivity.average_heartrate,
      max_heartrate: detailedActivity.max_heartrate,
      suffer_score: detailedActivity.suffer_score,
      device_name: detailedActivity.device_name,
      gear_id: detailedActivity.gear_id,
      external_id: detailedActivity.external_id,
      upload_id: detailedActivity.upload_id,
      laps: detailedActivity.laps || null,
      splits_metric: detailedActivity.splits_metric || null,
      splits_standard: detailedActivity.splits_standard || null,
      // strava_data_fetched_at: new Date().toISOString(), // REMOVED as per request
      // Fields to be populated by other services (location_city, etc. are kept if populated below)
    };

    if (detailedActivity.start_latlng && detailedActivity.start_latlng.length === 2) {
      enrichedRunData.start_latlng = `POINT(${detailedActivity.start_latlng[1]} ${detailedActivity.start_latlng[0]})`; // Lon Lat
    }
    if (detailedActivity.end_latlng && detailedActivity.end_latlng.length === 2) {
      enrichedRunData.end_latlng = `POINT(${detailedActivity.end_latlng[1]} ${detailedActivity.end_latlng[0]})`; // Lon Lat
    }

    // Step 4: Fetch Location Data
    if (detailedActivity.start_latlng && detailedActivity.start_latlng.length === 2) {
      console.log(`[ActivityProcessor] Fetching reverse geocode data for start_latlng: ${detailedActivity.start_latlng}`);
      const locationInfo: GeocodeLocationInfo | null = await fetchReverseGeocodeData(
        detailedActivity.start_latlng[0], // lat
        detailedActivity.start_latlng[1]  // lon
      );
      if (locationInfo) {
        enrichedRunData.location_city = locationInfo.city;
        enrichedRunData.location_state = locationInfo.state;
        enrichedRunData.location_country = locationInfo.country;
        // enrichedRunData.location_geocoding_provider = 'openweathermap'; // REMOVED as per request
        // enrichedRunData.location_fetched_at = new Date().toISOString(); // REMOVED as per request
        console.log(`[ActivityProcessor] Successfully fetched location: ${locationInfo.city}, ${locationInfo.country}`);
      } else {
        console.warn(`[ActivityProcessor] Could not fetch location data for activity ${detailedActivity.id}.`);
      }
    } else {
        console.warn(`[ActivityProcessor] No start_latlng for activity ${detailedActivity.id}, skipping reverse geocoding.`);
    }

    // Step 5: Fetch Weather Data
    if (detailedActivity.start_latlng && detailedActivity.start_latlng.length === 2 && detailedActivity.start_date_local) {
      console.log(`[ActivityProcessor] Fetching weather data for start_latlng: ${detailedActivity.start_latlng}, date: ${detailedActivity.start_date_local}`);
      const weatherInfo: EnrichedWeatherInfo | null = await fetchWeatherData(
        detailedActivity.start_latlng[0], // lat
        detailedActivity.start_latlng[1], // lon
        detailedActivity.start_date_local // date string
      );
      // REMOVE weather block as per instruction - discrete weather fields are not in schema
      if (weatherInfo) {
        // enrichedRunData.weather_timestamp = new Date(weatherInfo.weather_timestamp * 1000).toISOString();
        // enrichedRunData.temperature = weatherInfo.temperature;
        // ... (all other weather fields removed)
        // enrichedRunData.weather_fetched_at = new Date().toISOString();
        console.log(`[ActivityProcessor] Fetched weather: ${weatherInfo.weather_main}, but not adding discrete fields to enrichedRunData.`);
      } else {
        console.warn(`[ActivityProcessor] Could not fetch weather data for activity ${detailedActivity.id}.`);
      }
    } else {
        console.warn(`[ActivityProcessor] No start_latlng or start_date_local for activity ${detailedActivity.id}, skipping weather fetching.`);
    }

    // Step 7 & 8: Insert into enriched_runs
    console.log(`[ActivityProcessor] Inserting enriched data into 'enriched_runs' for Strava ID: ${detailedActivity.id}`);
    // Add processed_at timestamp
    enrichedRunData.processed_at = new Date().toISOString();

    console.log(`[ActivityProcessor] Attempting to insert enriched run for Strava ID ${detailedActivity.id}. Data:`, JSON.stringify(enrichedRunData, null, 2));
    const { data: savedRun, error: runSaveError } = await supabase
      .from('enriched_runs')
      .insert(enrichedRunData)
      .select('id')
      .single();

    if (runSaveError || !savedRun) {
      console.error(`[ActivityProcessor] FAILED to save enriched run for Strava ID ${detailedActivity.id}. Error:`, runSaveError, "Data attempted:", JSON.stringify(enrichedRunData, null, 2));
      throw new Error(`Error saving enriched run: ${runSaveError?.message || 'No saved run data returned'}`);
    }
    const newEnrichedRunId = savedRun.id;
    console.log(`[ActivityProcessor] Successfully saved enriched run. New Enriched ID: ${newEnrichedRunId}`);

    // Step 9: Process and Insert Splits into run_splits
    if (detailedActivity.splits_metric && detailedActivity.splits_metric.length > 0) {
      console.log(`[ActivityProcessor] Processing ${detailedActivity.splits_metric.length} metric splits for Enriched ID: ${newEnrichedRunId}`);
      let currentElapsedTime = 0; // To calculate start/end times of splits relative to activity start
      const activityStartDate = new Date(detailedActivity.start_date); // UTC start date of the activity

      const runSplitsData = detailedActivity.splits_metric.map(split => {
        const splitStartTime = new Date(activityStartDate.getTime() + currentElapsedTime * 1000);
        currentElapsedTime += split.elapsed_time; // Update for the next split's start
        const splitEndTime = new Date(activityStartDate.getTime() + currentElapsedTime * 1000);

        // Pace calculation: moving_time is for that split, distance is for that split (usually 1000m for km splits)
        // If split.distance is 1000m, pace_seconds is directly split.moving_time for that km.
        // If split.distance is different, pace_seconds = (split.moving_time / split.distance) * 1000 for per/km pace.
        // Strava API's splits_metric.pace_seconds already provides this in s/km if available.
        // Let's assume split.moving_time is what we want to record for the split's own duration over its distance.
        // And pace_seconds is the pace for a standard unit (km).
        let pace_seconds = null;
        if (split.distance > 0 && split.moving_time > 0) {
             // This is pace for the split's unit, if distance is 1km, it's pace/km
            pace_seconds = split.moving_time;
            if (split.distance !== 1000) { // If not exactly 1km, normalize to per/km
                 pace_seconds = (split.moving_time / split.distance) * 1000;
            }
        }
        if(split.pace_seconds) { // Prefer pace_seconds from Strava if available
            pace_seconds = split.pace_seconds;
        }


        return {
          enriched_run_id: newEnrichedRunId,
          user_id: userId,
          strava_id: detailedActivity.id, // Denormalized
          split_type: 'metric_km',
          split_number: split.split, // 1-based index from Strava
          distance: split.distance,
          elapsed_time: split.elapsed_time,
          moving_time: split.moving_time,
          elevation_difference: split.elevation_difference,
          average_speed: split.average_speed, // m/s from Strava
          average_heartrate: split.average_heartrate,
          // max_heartrate: split.max_heartrate, // Not typically in split data from Strava basic splits
          pace: pace_seconds ? Math.round(pace_seconds) : null, // Store as integer seconds per km
          start_time_utc: splitStartTime.toISOString(),
          end_time_utc: splitEndTime.toISOString(),
          // grade_adjusted_pace: null, // Requires calculation or more detailed data
        };
      });

      console.log(`[ActivityProcessor] Attempting to insert ${runSplitsData.length} splits for Enriched ID ${newEnrichedRunId}. Data:`, JSON.stringify(runSplitsData, null, 2));
      const { error: splitsSaveError } = await supabase.from('run_splits').insert(runSplitsData);

      if (splitsSaveError) {
        // Log error but don't necessarily make it fatal for the whole process
        console.error(`[ActivityProcessor] FAILED to save splits for Enriched ID ${newEnrichedRunId}. Error:`, splitsSaveError, "Data attempted:", JSON.stringify(runSplitsData, null, 2));
        // Optionally, you might want to mark the enriched_run record as 'partially_processed' or similar
      } else {
        console.log(`[ActivityProcessor] Successfully saved ${runSplitsData.length} splits for Enriched ID: ${newEnrichedRunId}`);
      }
    } else {
      console.log(`[ActivityProcessor] No metric splits found for activity ${detailedActivity.id}.`);
    }

    console.log(`[ActivityProcessor] Successfully processed and saved activity ${stravaActivityId}. Enriched Run ID: ${newEnrichedRunId}`);
    return { enrichedRunId: newEnrichedRunId, wasSkipped: false }; // For new saves

  } catch (error: any) {
    console.error(`[ActivityProcessor] Critical error processing activity ${stravaActivityId} for user ${userId}:`, error);
    // Log more error details if available
    if (error.response && error.response.data) {
      console.error('[ActivityProcessor] Error response data:', error.response.data);
    }
    return { enrichedRunId: null, error: error.message || error };
  }
};
