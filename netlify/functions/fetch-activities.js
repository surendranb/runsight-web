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

      let stravaClientId;
      let stravaClientSecret;

      try {
          console.log('[fetch-activities] Attempting to fetch Strava credentials from Vault for token refresh.');
          const { data: clientIdFromVault, error: clientIdError } = await supabase.rpc('get_strava_client_id');
          // Do not throw on error, allow fallback
          if (clientIdError) {
            console.warn('[fetch-activities] Error fetching Strava Client ID from Vault RPC:', clientIdError.message);
          }
          if (clientIdFromVault) {
              stravaClientId = clientIdFromVault;
          }

          const { data: clientSecretFromVault, error: clientSecretError } = await supabase.rpc('get_strava_client_secret');
          // Do not throw on error, allow fallback
          if (clientSecretError) {
            console.warn('[fetch-activities] Error fetching Strava Client Secret from Vault RPC:', clientSecretError.message);
          }
          if (clientSecretFromVault) {
              stravaClientSecret = clientSecretFromVault;
          }
      } catch (rpcError) {
          console.warn('[fetch-activities] Error fetching Strava credentials from Vault:', rpcError.message, 'Falling back to environment variables for token refresh.');
          stravaClientId = null; // Ensure fallback is triggered if partial fetch
          stravaClientSecret = null;
      }

      if (stravaClientId && stravaClientSecret) {
          console.log('[fetch-activities] Using Strava credentials from Vault for token refresh.');
      } else {
          console.log('[fetch-activities] Strava credentials not fully retrieved from Vault. Attempting fallback to environment variables for token refresh.');
          // Fallback to environment variables
          if (!stravaClientId) {
              stravaClientId = process.env.STRAVA_CLIENT_ID;
          }
          if (!stravaClientSecret) {
              stravaClientSecret = process.env.STRAVA_CLIENT_SECRET;
          }

          if (stravaClientId && stravaClientSecret) {
              console.log('[fetch-activities] Using Strava credentials from environment variables for token refresh.');
          } else {
              // If still not found, this is a critical configuration error for token refresh
              console.error('[fetch-activities] Strava Client ID or Secret is missing from both Vault and environment variables (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET). Cannot refresh token.');
              throw new Error('Strava API credentials for token refresh are not configured in Vault or environment variables.');
          }
      }

      const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: stravaClientId,
          client_secret: stravaClientSecret,
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

    if (params.days) {
      const afterTimestamp = Math.floor((Date.now() - (params.days * 24 * 60 * 60 * 1000)) / 1000);
      queryParams.append('after', afterTimestamp.toString());
      console.log(`[fetch-activities] Fetching for last ${params.days} days (after: ${afterTimestamp})`);
    } else if (params.page) {
      queryParams.append('page', params.page.toString());
      console.log(`[fetch-activities] Fetching page ${params.page}`);
    } else {
      // Default behavior if no specific params: fetch first page of recent activities
      queryParams.append('page', '1');
      console.log('[fetch-activities] No specific period/page, fetching page 1 by default.');
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