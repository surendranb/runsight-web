import { supabase } from './supabase';
import { fetchWeatherData } from './weather';
import { SimpleUser } from './simple-auth';

export interface SimpleRun {
  id: string;
  strava_id: number;
  name: string;
  distance: number;
  moving_time: number;
  start_date: string;
  weather_data?: any;
}

export const fetchStravaActivities = async (accessToken: string, days: number = 7): Promise<any[]> => {
  console.log(`🏃 Fetching Strava activities for last ${days} days...`);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  
  const url = `https://www.strava.com/api/v3/athlete/activities?after=${startTimestamp}&per_page=50`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch activities: ${response.status}`);
  }

  const activities = await response.json();
  const runningActivities = activities.filter((activity: any) => 
    activity.type === 'Run' || activity.sport_type === 'Run'
  );
  
  console.log(`✅ Found ${runningActivities.length} running activities`);
  return runningActivities;
};

export const fetchDetailedActivity = async (activityId: number, accessToken: string): Promise<any> => {
  console.log(`📊 Fetching detailed activity: ${activityId}`);
  
  const response = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch detailed activity: ${response.status}`);
  }

  return response.json();
};

export const enrichWithWeather = async (activity: any): Promise<any> => {
  if (!activity.start_latlng || activity.start_latlng.length !== 2) {
    console.log(`⏭️ Skipping weather for ${activity.name} - no GPS coordinates`);
    return null;
  }

  console.log(`🌤️ Fetching weather for ${activity.name}...`);
  
  try {
    const weatherData = await fetchWeatherData(
      activity.start_latlng[0], // lat
      activity.start_latlng[1], // lon
      activity.start_date_local
    );
    
    if (weatherData) {
      console.log(`✅ Weather fetched: ${weatherData.weather_main}, ${weatherData.temperature}°C`);
    }
    
    return weatherData;
  } catch (error) {
    console.warn(`⚠️ Failed to fetch weather for ${activity.name}:`, error);
    return null;
  }
};

export const saveRunToDatabase = async (user: SimpleUser, activity: any, weatherData: any): Promise<SimpleRun> => {
  console.log(`💾 Saving run to database: ${activity.name}`);
  
  // Check if run already exists
  const { data: existingRun } = await supabase
    .from('runs')
    .select('id')
    .eq('strava_id', activity.id)
    .single();

  if (existingRun) {
    console.log(`⏭️ Run ${activity.name} already exists, skipping`);
    return existingRun;
  }

  const runData = {
    user_id: user.id,
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
    weather_data: weatherData,
    strava_data: activity,
  };

  console.log('📝 Inserting run data:', {
    name: runData.name,
    distance: runData.distance,
    user_id: runData.user_id,
    strava_id: runData.strava_id,
  });

  const { data, error } = await supabase
    .from('runs')
    .insert(runData)
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to save run:', error);
    console.error('📋 Run data that failed:', runData);
    throw new Error(`Failed to save run: ${error.message}`);
  }

  console.log(`✅ Run saved successfully: ${data.name}`);
  return data;
};

export const getUserRuns = async (userId: string): Promise<SimpleRun[]> => {
  console.log(`📖 Fetching runs for user: ${userId}`);
  
  const { data, error } = await supabase
    .from('runs')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('❌ Failed to fetch runs:', error);
    throw new Error(`Failed to fetch runs: ${error.message}`);
  }

  console.log(`✅ Found ${data.length} runs`);
  return data;
};

export const processAndSaveActivities = async (
  user: SimpleUser, 
  activities: any[],
  onProgress?: (current: number, total: number, activity: string) => void
): Promise<SimpleRun[]> => {
  console.log(`🔄 Processing ${activities.length} activities...`);
  
  const savedRuns: SimpleRun[] = [];
  
  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i];
    
    if (onProgress) {
      onProgress(i + 1, activities.length, activity.name);
    }
    
    try {
      // Fetch detailed activity data
      const detailedActivity = await fetchDetailedActivity(activity.id, user.access_token);
      
      // Enrich with weather data
      const weatherData = await enrichWithWeather(detailedActivity);
      
      // Save to database
      const savedRun = await saveRunToDatabase(user, detailedActivity, weatherData);
      savedRuns.push(savedRun);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Failed to process activity ${activity.name}:`, error);
      // Continue with other activities
    }
  }
  
  console.log(`✅ Successfully processed ${savedRuns.length}/${activities.length} activities`);
  return savedRuns;
};