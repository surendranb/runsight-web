import { supabase } from './supabase';
import { StravaAuthResponse, Activity, StravaDetailedActivity } from '../types';
// fetchWeatherData and saveWeatherToDatabase are no longer directly used here.
// import { fetchWeatherData, saveWeatherToDatabase } from '../lib/weather';
import { processAndSaveActivity } from './activityProcessor';

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

/**
 * @deprecated This function is being refactored to use the new activity processing pipeline.
 * Its direct usage for saving to the old 'activities' table is being phased out.
 * The caller should ideally be updated to call processAndSaveActivity directly
 * and manage Strava access token retrieval.
 */
export const saveActivityToDatabase = async (activity: any, userId: string /*, stravaAccessToken: string - This would need to be added */): Promise<any> => {
  console.log(`[saveActivityToDatabase - DEPRECATEDISH] Received call for activity ${activity.id}, user ${userId}. Redirecting to processAndSaveActivity.`);

  // IMPORTANT: stravaAccessToken is needed by processAndSaveActivity.
  // This function's signature or its caller needs to be updated to provide it.
  // For now, using a placeholder. This will fail if not replaced.
  const stravaAccessToken = 'PLACEHOLDER_ACCESS_TOKEN_NEEDS_TO_BE_PROVIDED';

  if (stravaAccessToken === 'PLACEHOLDER_ACCESS_TOKEN_NEEDS_TO_BE_PROVIDED') {
    console.error(`[saveActivityToDatabase] CRITICAL: stravaAccessToken is a placeholder. The actual token must be provided to call processAndSaveActivity.`);
    // Return a structure similar to what the old function might have, or handle error
    return { id: `temp_placeholder_error_${activity.id}`, error: "Missing Strava Access Token for new processing pipeline." };
  }

  if (!activity || !activity.id) {
    console.error('[saveActivityToDatabase] Invalid activity object received.');
    return { error: "Invalid activity object." };
  }

  // The old logic for temp_user check and direct supabase.upsert to 'activities' table is now commented out.
  // if (userId.startsWith('temp_')) {
  //   console.warn('Skipping activity save for temporary user due to RLS policy');
  //   // ... old return for temp user
  // }
  // const { data, error } = await supabase.from('activities').upsert({ ... }); // Old logic
  // ... old weather fetching logic ...

  try {
    const result = await processAndSaveActivity(
      activity.id, // Strava Activity ID (number)
      userId,      // Internal User ID (UUID)
      stravaAccessToken
    );

    if (result.error) {
      console.error(`[saveActivityToDatabase] Error processing activity ${activity.id} via new pipeline:`, result.error);
      // Adapt error structure if needed to be compatible with callers
      return {
        id: `temp_error_${activity.id}`, // Keep a similar structure for ID if possible
        strava_id: activity.id,
        error: result.error.message || result.error
      };
    }

    console.log(`[saveActivityToDatabase] Activity ${activity.id} processed via new pipeline. Enriched Run ID: ${result.enrichedRunId}`);
    // Return a compatible success response, perhaps the new enrichedRunId or a status
    // The old function returned the saved activity object from the 'activities' table.
    // The new function returns the enrichedRunId. We need to adapt.
    return {
      id: result.enrichedRunId, // This is the new UUID from enriched_runs
      strava_id: activity.id,
      name: activity.name, // Include some basic fields for compatibility if needed by UI
      // distance: activity.distance, // etc.
      processed_via_new_pipeline: true,
      // Note: This response structure is different from the original one.
      // Callers might need adjustment if they relied on the full old activity structure.
    };

  } catch (e: any) {
    console.error(`[saveActivityToDatabase] Unexpected error when calling processAndSaveActivity for ${activity.id}:`, e);
    return {
      id: `temp_unexpected_error_${activity.id}`,
      strava_id: activity.id,
      error: e.message || String(e)
    };
  }
};

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