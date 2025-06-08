import { supabase } from '../src/lib/supabase';
import { fetchWeatherData, saveWeatherToDatabase } from '../src/lib/weather';
import { Activity } from '../src/types'; // Optional, for better typing

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const backfillWeather = async () => {
  let apiCallCount = 0;
  const DAILY_API_LIMIT = 980; // Stay safely below typical 1000 call limits
  const DELAY_MS = 3000; // 3 seconds delay, ~20 calls per minute

  console.log('Starting weather data backfill process...');

  try {
    // Fetch activities that are Runs and have necessary location/date info
    // const { data: activities, error: activitiesError } = await supabase
    //   .from('activities')
    //   .select('id, start_latlng, start_date_local, type')
    //   .eq('type', 'Run')
    //   .not('start_latlng', 'is', null)
    //   .not('start_date_local', 'is', null);

    // Fetch specific activity for testing
    const specificActivityId = '748a221e-472e-45b5-b828-da722c59e9a2';
    console.log(`Fetching specific activity for testing: ${specificActivityId}`);
    const { data: specificActivity, error: activitiesError } = await supabase
      .from('activities')
      .select('id, start_latlng, start_date_local, type')
      .eq('id', specificActivityId)
      .single(); // Use single to get one record or null

    // Ensure 'activities' is an array for subsequent logic
    const activities = specificActivity ? [specificActivity] : [];

    if (activitiesError && activitiesError.code !== 'PGRST116') { // PGRST116: "Actual row count does not match expected row count for single row queries" (means not found)
      console.error('Error fetching specific activity:', activitiesError);
      return;
    }

    if (!activities || activities.length === 0) {
      console.log('No activities found (or specific activity not found) that need weather data processing.');
      return;
    }

    console.log(`Fetched ${activities.length} specific activity for processing.`);

    // Fetch existing weather data activity IDs to avoid reprocessing
    const { data: weatherEntries, error: weatherError } = await supabase
      .from('weather')
      .select('activity_id');

    if (weatherError) {
      console.error('Error fetching existing weather data:', weatherError);
      // Decide if you want to proceed or return. For now, let's try to proceed.
      // return;
    }

    const existingWeatherActivityIds = new Set(weatherEntries?.map(w => w.activity_id) || []);
    console.log(`Found ${existingWeatherActivityIds.size} existing weather entries.`);

    const activitiesToProcess = activities.filter(
      (activity): activity is Activity & { id: string; start_latlng: [number, number]; start_date_local: string } => {
        if (!activity.id || existingWeatherActivityIds.has(activity.id)) {
          return false;
        }
        if (!activity.start_latlng || activity.start_latlng.length !== 2) {
          // This case should ideally be caught by the query, but double-check
          console.warn(`Activity ${activity.id} has invalid start_latlng, skipping.`);
          return false;
        }
        if (!activity.start_date_local) {
           // This case should ideally be caught by the query, but double-check
          console.warn(`Activity ${activity.id} has invalid start_date_local, skipping.`);
          return false;
        }
        return true;
      }
    );


    console.log(`Processing ${activitiesToProcess.length} activities for weather data backfill.`);

    for (let i = 0; i < activitiesToProcess.length; i++) {
      const activity = activitiesToProcess[i];

      if (apiCallCount >= DAILY_API_LIMIT) {
        console.log('Reached daily API limit. Stopping backfill process.');
        break;
      }

      // Double check latlng, though type guard should handle it
      if (!activity.start_latlng || activity.start_latlng.length !== 2) {
        console.warn(`Skipping activity ${activity.id} due to invalid start_latlng: ${activity.start_latlng}`);
        continue;
      }

      console.log(`Processing activity ${activity.id} (${i + 1} of ${activitiesToProcess.length}). API calls: ${apiCallCount}`);

      try {
        const weatherDataResult = await fetchWeatherData(
          activity.start_latlng[0],
          activity.start_latlng[1],
          activity.start_date_local
        );
        apiCallCount++;

        if (weatherDataResult && weatherDataResult.data) {
          await saveWeatherToDatabase(weatherDataResult.data, activity.id);
          console.log(`Successfully fetched and saved weather for activity ${activity.id}.`);
        } else {
          console.warn(`No weather data returned for activity ${activity.id}. API response:`, weatherDataResult);
        }
      } catch (error) {
        console.error(`Error processing weather for activity ${activity.id}:`, error);
        // Optional: implement more sophisticated error handling, e.g., retry for certain errors
      }

      // Delay between API calls, even after errors to avoid overwhelming the API
      if (i < activitiesToProcess.length - 1) { // No delay after the last item
        console.log(`Waiting ${DELAY_MS / 1000}s before next call...`);
        await delay(DELAY_MS);
      }
    }

    console.log('Weather data backfill processing loop completed.');
    if (apiCallCount >= DAILY_API_LIMIT) {
        console.log('Stopped due to reaching API call limit.');
    }

  } catch (error) {
    console.error('An unexpected error occurred during the backfill process:', error);
  }
};

backfillWeather()
  .then(() => console.log('Backfill script execution finished.'))
  .catch(error => {
    console.error('Critical error running backfill script:', error);
    process.exit(1); // Exit with error code if the main function fails catastrophically
  });
