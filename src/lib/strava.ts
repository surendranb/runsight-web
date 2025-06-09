import { supabase } from './supabase';
import { StravaAuthResponse, Activity, StravaDetailedActivity } from '../types';
// fetchWeatherData and saveWeatherToDatabase are no longer directly used here.
// import { fetchWeatherData, saveWeatherToDatabase } from '../lib/weather';
// import { processAndSaveActivity } from './activityProcessor'; // No longer needed as saveActivityToDatabase is removed

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

export const fetchStravaActivities = async (accessToken: string, page: number = 1, perPage: number = 30, after?: number): Promise<any[]> => {
  let url = `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`;
  if (after) {
    url += `&after=${after}`;
  }
  
  console.log(`Fetching Strava activities with token (first 10 chars): ${accessToken.substring(0, 10)}..., page: ${page}, perPage: ${perPage}${after ? ', after: ' + after : ''}`);
  console.log(`Requesting URL: ${url}`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const responseText = await response.text(); // Read text for better error logging if JSON parse fails

  if (!response.ok) {
    console.error(`Failed to fetch Strava activities: ${response.status} ${response.statusText}. Response: ${responseText.substring(0, 500)}`);
    throw new Error(`Failed to fetch Strava activities: ${response.status} ${response.statusText}. Response: ${responseText.substring(0, 500)}`);
  }

  try {
    const data = JSON.parse(responseText);
    console.log(`Successfully fetched ${data.length} activities.`);
    return data;
  } catch (error) {
    console.error('Failed to parse Strava activities response as JSON:', error);
    console.error('Response text (first 500 chars):', responseText.substring(0,500));
    throw new Error('Failed to parse Strava activities response as JSON.');
  }
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

// Removed saveActivityToDatabase function as it's superseded by direct calls to processAndSaveActivity

export const fetchDetailedStravaActivity = async (activityId: string, accessToken: string): Promise<StravaDetailedActivity> => {
  console.log(`Fetching detailed Strava activity ${activityId}...`);
  const apiUrl = `https://www.strava.com/api/v3/activities/${activityId}`;

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const responseText = await response.text(); // Read text first to avoid issues with large JSON

  if (!response.ok) {
    console.error(`Failed to fetch detailed Strava activity ${activityId}: ${response.status} ${responseText}`);
    throw new Error(`Failed to fetch detailed Strava activity ${activityId}: ${response.status} ${responseText}`);
  }

  try {
    const data: StravaDetailedActivity = JSON.parse(responseText);
    console.log(`Successfully fetched detailed Strava activity ${activityId}`);
    return data;
  } catch (e) {
    console.error(`Failed to parse JSON for detailed Strava activity ${activityId}:`, e);
    console.error(`Response text was: ${responseText.substring(0, 500)}...`); // Log part of the response
    throw new Error(`Failed to parse JSON for detailed Strava activity ${activityId}`);
  }
};