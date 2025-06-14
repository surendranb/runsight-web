// netlify/functions/fetch-activities.js
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch'); // Assuming node-fetch is available in Netlify environment or added as a dependency

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

  // Environment variables
  const {
    VITE_SUPABASE_URL: SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    VITE_STRAVA_CLIENT_ID: STRAVA_CLIENT_ID, // Needed for token refresh
    VITE_STRAVA_CLIENT_SECRET: STRAVA_CLIENT_SECRET // Needed for token refresh
  } = process.env;

  // Check for missing environment variables
  const missingVars = [];
  if (!SUPABASE_URL) missingVars.push('VITE_SUPABASE_URL');
  if (!SUPABASE_SERVICE_KEY) missingVars.push('SUPABASE_SERVICE_KEY');
  if (!STRAVA_CLIENT_ID) missingVars.push('VITE_STRAVA_CLIENT_ID');
  if (!STRAVA_CLIENT_SECRET) missingVars.push('VITE_STRAVA_CLIENT_SECRET');

  if (missingVars.length > 0) {
    console.error('[fetch-activities] Missing environment variables:', missingVars.join(', '));
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error', message: `Missing environment variables: ${missingVars.join(', ')}` }),
    };
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const body = JSON.parse(event.body);
    const userId = body.userId;
    const params = body.params || {}; // e.g., { page: 1, per_page: 30, after: timestamp, before: timestamp }

    if (!userId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'User ID is required' }) };
    }

    console.log(`[fetch-activities] Received request for userId: ${userId} with params:`, JSON.stringify(params));

    // Get user's Strava tokens from Supabase
    const { data: userAuthData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userAuthData || !userAuthData.user) {
      console.error('[fetch-activities] User not found or error fetching user:', userError);
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'User not found or error fetching user', details: userError?.message }) };
    }

    const user = userAuthData.user;
    let accessToken = user.user_metadata?.strava_access_token;
    const refreshToken = user.user_metadata?.strava_refresh_token;
    const expiresAt = user.user_metadata?.strava_expires_at;

    if (!accessToken || !refreshToken) { // Refresh token is crucial for long-term access
      console.error('[fetch-activities] Strava access or refresh token not found for user.');
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Strava token not found for user. Please re-authenticate.' }) };
    }

    // Check if token needs refresh
    if (expiresAt && Date.now() / 1000 > expiresAt) {
      console.log('[fetch-activities] Strava token expired, attempting refresh for user:', userId);
      const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        const errorBody = await refreshResponse.json().catch(() => ({ message: 'Failed to refresh Strava token, and error response was not JSON.'}));
        console.error('[fetch-activities] Failed to refresh Strava token. Status:', refreshResponse.status, 'Body:', errorBody);
        // Potentially mark token as invalid or ask user to re-auth
        return { statusCode: refreshResponse.status, headers, body: JSON.stringify({ error: 'Failed to refresh Strava token', details: errorBody.message || errorBody }) };
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update user metadata with new tokens
      const newMetadata = {
        ...user.user_metadata,
        strava_access_token: refreshData.access_token,
        strava_refresh_token: refreshData.refresh_token || refreshToken, // Strava might not always return a new refresh_token
        strava_expires_at: refreshData.expires_at,
      };
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: newMetadata,
      });
      if (updateError) {
        console.error('[fetch-activities] Failed to update user with new Strava tokens:', updateError);
        // Non-fatal for this request, proceed with the new token for this session, but log it.
      }
      console.log('[fetch-activities] Strava token refreshed successfully for user:', userId);
    }

    // Construct Strava API URL based on params
    const queryParams = new URLSearchParams();
    queryParams.append('page', (params.page || 1).toString());
    queryParams.append('per_page', (params.per_page || 50).toString()); // Default 50, Strava max is 200

    if (params.after && typeof params.after === 'number') {
      queryParams.append('after', params.after.toString());
    }
    if (params.before && typeof params.before === 'number') {
      queryParams.append('before', params.before.toString());
    }

    const stravaApiUrl = `https://www.strava.com/api/v3/athlete/activities?${queryParams.toString()}`;
    // ADDED LOGGING:
    console.log(`[fetch-activities-DEBUG] Strava API Call Details: URL=${stravaApiUrl}, AccessTokenPresent=${!!accessToken}`);
    console.log(`[fetch-activities-DEBUG] Params received by fetch-activities: page=${params.page}, per_page=${params.per_page}, after=${params.after ? new Date(params.after * 1000).toISOString() : 'N/A'}, before=${params.before ? new Date(params.before * 1000).toISOString() : 'N/A'}`);

    const activitiesResponse = await fetch(stravaApiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!activitiesResponse.ok) {
      const errorBody = await activitiesResponse.json().catch(() => ({ message: 'Failed to fetch activities from Strava, and error response was not JSON.' }));
      console.error('[fetch-activities] Failed to fetch activities from Strava. Status:', activitiesResponse.status, 'Body:', errorBody);
      return { statusCode: activitiesResponse.status, headers, body: JSON.stringify({ error: 'Failed to fetch activities from Strava', details: errorBody.message || errorBody }) };
    }

    const fetchedActivities = await activitiesResponse.json();
    // ADDED LOGGING:
    console.log(`[fetch-activities-DEBUG] Raw activities from Strava (page ${params.page || 1}, count ${fetchedActivities.length}): IDs = ${fetchedActivities.slice(0, 5).map(a => a.id).join(', ')}...`);

    // Filter for actual running activities and ensure they have latlng
    const filteredRuns = fetchedActivities.filter(activity => activity.type === 'Run');
    // ADDED LOGGING:
    console.log(`[fetch-activities-DEBUG] Filtered runs (page ${params.page || 1}, count ${filteredRuns.length}): IDs = ${filteredRuns.slice(0, 5).map(a => a.id).join(', ')}...`);

    console.log(`[fetch-activities] Fetched ${filteredRuns.length} runs (after filtering) for user ${userId}. Original count from Strava this page: ${fetchedActivities.length}.`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        activities: filteredRuns,
        count: filteredRuns.length,
        rawCountThisPage: fetchedActivities.length
      }),
    };

  } catch (error) {
    console.error('[fetch-activities] Critical error in handler:', error);
    // Check if error is due to JSON parsing of event.body
    if (error instanceof SyntaxError && error.message.includes("JSON.parse")) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid request body: Not valid JSON."}) };
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch activities due to an unexpected server error', message: error.message }),
    };
  }
};
