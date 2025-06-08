import { supabase } from './supabase';
import { StravaAuthResponse, Activity } from '../types';

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
  
  const { data, error } = await supabase
    .from('users')
    .upsert({
      strava_id: athlete.id,
      email: `${athlete.id}@strava.local`, // Strava doesn't provide email in public API
      first_name: athlete.firstname,
      last_name: athlete.lastname,
      profile_medium: athlete.profile_medium,
      access_token,
      refresh_token,
      expires_at,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    throw error;
  }
  
  console.log('User saved successfully:', data);
  return data;
};

export const saveActivityToDatabase = async (activity: any, userId: string) => {
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

  if (error) throw error;
  return data;
};