// netlify/functions/fetch-activities.js
// Netlify Function: Fetch Strava activities (server-side)

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', // Ensure POST is allowed
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed, please use POST.' })
    };
  }

  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const ACTUAL_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Use SUPABASE_SERVICE_KEY directly

    if (!SUPABASE_URL || !ACTUAL_SERVICE_KEY) {
      console.error('[fetch-activities] Missing Supabase configuration (URL or Service Key)');
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(SUPABASE_URL, ACTUAL_SERVICE_KEY);

    // MODIFIED: Destructure userId and params from request body
    const body = JSON.parse(event.body);
    const userId = body.userId;
    const params = body.params || {}; // Default to empty object if params not sent

    // Log received parameters for debugging
    console.log('[fetch-activities] Received request for userId:', userId, 'with params:', params);


    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get user's Strava tokens from Supabase
    const { data: userAuthData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !userAuthData || !userAuthData.user) {
      console.error('[fetch-activities] User not found or error fetching user:', userError);
      throw new Error(`User not found or error fetching user: ${userError?.message || 'Unknown error'}`);
    }

    const user = userAuthData.user; // Actual user object

    let accessToken = user.user_metadata?.strava_access_token;
    const refreshToken = user.user_metadata?.strava_refresh_token;
    const expiresAt = user.user_metadata?.strava_expires_at;

    if (!accessToken) {
      throw new Error('Strava access token not found for user.');
    }

    // Check if token needs refresh
    if (expiresAt && Date.now() / 1000 > expiresAt) {
      console.log('[fetch-activities] Strava token expired, attempting refresh for user:', userId);
      const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!refreshResponse.ok) {
        const errorBody = await refreshResponse.text();
        console.error('[fetch-activities] Failed to refresh Strava token. Status:', refreshResponse.status, 'Body:', errorBody);
        throw new Error(`Failed to refresh Strava token. Status: ${refreshResponse.status}`);
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update user metadata with new tokens
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...user.user_metadata,
          strava_access_token: refreshData.access_token,
          strava_refresh_token: refreshData.refresh_token || refreshToken, // Strava might not always return a new refresh_token
          strava_expires_at: refreshData.expires_at
        }
      });
      if (updateError) {
          console.error('[fetch-activities] Failed to update user with new Strava tokens:', updateError);
          // Non-fatal, proceed with new token for this session
      }
      console.log('[fetch-activities] Strava token refreshed successfully for user:', userId);
    }

    // Construct Strava API URL based on params
    let stravaApiUrl = 'https://www.strava.com/api/v3/athlete/activities';
    const queryParams = new URLSearchParams();

    // Default per_page, can be overridden by params
    const perPage = params.per_page || 50;
    queryParams.append('per_page', perPage.toString());

    // Page parameter
    if (params.page) {
      queryParams.append('page', params.page.toString());
    } else {
      queryParams.append('page', '1'); // Default to page 1
    }

    // 'after' timestamp parameter
    if (params.after && typeof params.after === 'number') {
      queryParams.append('after', String(params.after));
      console.log(`[fetch-activities] Applying 'after' filter: ${new Date(params.after * 1000).toISOString()}`);
    } else if (params.after) {
      // Attempt to parse if it's a string number
      const afterTimestamp = parseInt(params.after, 10);
      if (!isNaN(afterTimestamp)) {
        queryParams.append('after', String(afterTimestamp));
        console.log(`[fetch-activities] Applying 'after' filter (parsed from string): ${new Date(afterTimestamp * 1000).toISOString()}`);
      } else {
        console.log('[fetch-activities] Ignoring invalid "after" parameter:', params.after);
      }
    }

    // 'before' timestamp parameter
    if (params.before && typeof params.before === 'number') {
      queryParams.append('before', String(params.before));
      console.log(`[fetch-activities] Applying 'before' filter: ${new Date(params.before * 1000).toISOString()}`);
    } else if (params.before) {
      const beforeTimestamp = parseInt(params.before, 10);
      if (!isNaN(beforeTimestamp)) {
        queryParams.append('before', String(beforeTimestamp));
        console.log(`[fetch-activities] Applying 'before' filter (parsed from string): ${new Date(beforeTimestamp * 1000).toISOString()}`);
      } else {
        console.log('[fetch-activities] Ignoring invalid "before" parameter, defaulting to now for "before".');
        const nowTimestamp = Math.floor(Date.now() / 1000);
        queryParams.append('before', nowTimestamp.toString());
        console.log(`[fetch-activities] Applying 'before' filter (defaulted to now): ${new Date(nowTimestamp * 1000).toISOString()}`);
      }
    } else {
      // Default to now if 'before' is not provided at all
      const nowTimestamp = Math.floor(Date.now() / 1000);
      queryParams.append('before', nowTimestamp.toString());
      console.log(`[fetch-activities] Applying 'before' filter (defaulted to now as none provided): ${new Date(nowTimestamp * 1000).toISOString()}`);
    }

    stravaApiUrl += `?${queryParams.toString()}`;
    console.log('[fetch-activities] Calling Strava API URL:', stravaApiUrl);

    const activitiesResponse = await fetch(stravaApiUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!activitiesResponse.ok) {
      const errorBody = await activitiesResponse.text();
      console.error('[fetch-activities] Failed to fetch activities from Strava. Status:', activitiesResponse.status, 'Body:', errorBody);
      throw new Error(`Failed to fetch activities from Strava. Status: ${activitiesResponse.status}`);
    }

    const fetchedActivities = await activitiesResponse.json();

    // Filter for actual running activities and ensure they have latlng
    const filteredRuns = fetchedActivities.filter(activity =>
      activity.type === 'Run' && 
      activity.start_latlng && 
      activity.start_latlng.length === 2
    );

    console.log(`[fetch-activities] ✅ Fetched ${filteredRuns.length} runs (after filtering) for user ${userId}. Original count from Strava: ${fetchedActivities.length}.`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        activities: filteredRuns, // MODIFIED: key from 'runs' to 'activities'
        count: filteredRuns.length
      })
    };

  } catch (error) {
    console.error('[fetch-activities] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch activities',
        message: error.message 
      })
    };
  }
};
