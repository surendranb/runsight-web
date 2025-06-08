import { supabase } from './supabase';
import { StravaAuthResponse, Activity } from '../types';
import { fetchWeatherData, saveWeatherToDatabase } from '../lib/weather';

const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = import.meta.env.VITE_STRAVA_CLIENT_SECRET;
const STRAVA_REDIRECT_URI = import.meta.env.VITE_STRAVA_REDIRECT_URI;

export const getStravaAuthUrl = () => {
  const scope = 'read,activity:read_all';
  const responseType = 'code';
  const approvalPrompt = 'force';
  
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=${responseType}&redirect_uri=${encodeURIComponent(STRAVA_REDIRECT_URI)}&approval_prompt=${approvalPrompt}&scope=${scope}`;
  
  console.log('Auth URL:', authUrl);
  console.log('Client ID:', STRAVA_CLIENT_ID);
  console.log('Redirect URI:', STRAVA_REDIRECT_URI);
  
  return authUrl;
};

export const exchangeCodeForToken = async (code: string): Promise<StravaAuthResponse> => {
  console.log('Exchanging code for token:', code);
  console.log('Using client ID:', STRAVA_CLIENT_ID);
  console.log('Using redirect URI:', STRAVA_REDIRECT_URI);
  
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });

  const responseText = await response.text();
  console.log('Token exchange response:', responseText);

  if (!response.ok) {
    throw new Error(`Failed to exchange code for token: ${response.status} ${responseText}`);
  }

  return JSON.parse(responseText);
};

export const refreshStravaToken = async (refreshToken: string): Promise<StravaAuthResponse> => {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return response.json();
};

export const fetchStravaActivities = async (accessToken: string, page = 1, perPage = 50): Promise<any[]> => {
  console.log('Fetching activities with token:', accessToken.substring(0, 10) + '...');
  
  const response = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const responseText = await response.text();
  console.log('Activities response:', response.status, responseText);

  if (!response.ok) {
    throw new Error(`Failed to fetch activities: ${response.status} ${responseText}`);
  }

  return JSON.parse(responseText);
};

export const saveUserToDatabase = async (authResponse: StravaAuthResponse) => {
  const { athlete, access_token, refresh_token, expires_at } = authResponse;
  
  console.log('Saving user to database:', athlete);
  
  // First, try to find existing user
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('strava_id', athlete.id)
    .single();

  let userData;
  if (existingUser) {
    // Update existing user
    const { data, error } = await supabase
      .from('users')
      .update({
        email: `${athlete.id}@strava.local`,
        first_name: athlete.firstname,
        last_name: athlete.lastname,
        profile_medium: athlete.profile_medium,
        access_token,
        refresh_token,
        expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq('strava_id', athlete.id)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      throw error;
    }
    userData = data;
  } else {
    // Try to create new user
    const { data, error } = await supabase
      .from('users')
      .insert({
        strava_id: athlete.id,
        email: `${athlete.id}@strava.local`,
        first_name: athlete.firstname,
        last_name: athlete.lastname,
        profile_medium: athlete.profile_medium,
        access_token,
        refresh_token,
        expires_at,
      })
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      
      // If RLS is blocking, create a temporary user object for localStorage
      if (error.code === '42501') {
        console.warn('RLS policy blocking insert, using temporary user session');
        userData = {
          id: `temp_${athlete.id}`,
          strava_id: athlete.id,
          email: `${athlete.id}@strava.local`,
          first_name: athlete.firstname,
          last_name: athlete.lastname,
          profile_medium: athlete.profile_medium,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        // Store tokens separately for API calls
        localStorage.setItem('strava_tokens', JSON.stringify({
          access_token,
          refresh_token,
          expires_at,
        }));
      } else {
        throw error;
      }
    } else {
      userData = data;
    }
  }
  
  console.log('User saved successfully:', userData);
  return userData;
};

export const getExistingActivitiesDateRange = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('start_date')
      .eq('user_id', userId)
      .eq('type', 'Run')
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching existing activities:', error);
      return { earliest: null, latest: null, count: 0 };
    }

    if (!data || data.length === 0) {
      return { earliest: null, latest: null, count: 0 };
    }

    const dates = data.map(a => new Date(a.start_date));
    return {
      earliest: new Date(Math.min(...dates.map(d => d.getTime()))),
      latest: new Date(Math.max(...dates.map(d => d.getTime()))),
      count: data.length
    };
  } catch (error) {
    console.error('Error checking existing activities:', error);
    return { earliest: null, latest: null, count: 0 };
  }
};

export const saveActivityToDatabase = async (activity: any, userId: string) => {
  // Skip database save if using temporary user (RLS issue)
  if (userId.startsWith('temp_')) {
    console.warn('Skipping activity save for temporary user due to RLS policy');
    return {
      id: `temp_activity_${activity.id}`,
      strava_id: activity.id,
      user_id: userId,
      name: activity.name,
      distance: activity.distance,
      moving_time: activity.moving_time,
      elapsed_time: activity.elapsed_time,
      total_elevation_gain: activity.total_elevation_gain,
      type: activity.type,
      start_date: activity.start_date,
      start_date_local: activity.start_date_local,
      start_latlng: activity.start_latlng,
      end_latlng: activity.end_latlng,
      average_speed: activity.average_speed,
      max_speed: activity.max_speed,
      average_heartrate: activity.average_heartrate,
      max_heartrate: activity.max_heartrate,
    };
  }

  const { data, error } = await supabase
    .from('activities')
    .upsert({
      strava_id: activity.id,
      user_id: userId,
      name: activity.name,
      distance: activity.distance,
      moving_time: activity.moving_time,
      elapsed_time: activity.elapsed_time,
      total_elevation_gain: activity.total_elevation_gain,
      type: activity.type,
      start_date: activity.start_date,
      start_date_local: activity.start_date_local,
      timezone: activity.timezone,
      utc_offset: activity.utc_offset,
      start_latlng: activity.start_latlng,
      end_latlng: activity.end_latlng,
      location_city: activity.location_city,
      location_state: activity.location_state,
      location_country: activity.location_country,
      achievement_count: activity.achievement_count,
      kudos_count: activity.kudos_count,
      comment_count: activity.comment_count,
      athlete_count: activity.athlete_count,
      photo_count: activity.photo_count,
      average_speed: activity.average_speed,
      max_speed: activity.max_speed,
      average_heartrate: activity.average_heartrate,
      max_heartrate: activity.max_heartrate,
      suffer_score: activity.suffer_score,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Activity save error:', error);
    throw error;
  }

  // Fetch and save weather data
  if (data && data.start_latlng && data.start_latlng.length === 2 && data.start_date_local) {
    try {
      console.log(`Fetching weather for activity ${data.id} at ${data.start_latlng} on ${data.start_date_local}`);
      const weatherDataResult = await fetchWeatherData(data.start_latlng[0], data.start_latlng[1], data.start_date_local);
      if (weatherDataResult && weatherDataResult.data) {
        console.log(`Saving weather for activity ${data.id}`);
        await saveWeatherToDatabase(weatherDataResult.data, data.id);
      }
    } catch (weatherError) {
      console.error('Failed to fetch or save weather data:', weatherError);
      // Do not re-throw, allow activity saving to succeed
    }
  }

  return data;
};