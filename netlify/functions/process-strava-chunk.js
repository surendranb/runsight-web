// netlify/functions/process-strava-chunk.js
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch'); // Required for making HTTP requests

// Helper: Get Strava Access Token (with refresh logic) - similar to fetch-activities.js
async function getStravaAccessToken(supabase, userId) {
    const { data: userAuthData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userAuthData || !userAuthData.user) {
        console.error('[process-strava-chunk] User not found or error fetching user:', userError);
        throw new Error(`User not found: ${userError?.message}`);
    }
    const user = userAuthData.user;
    let accessToken = user.user_metadata?.strava_access_token;
    const refreshToken = user.user_metadata?.strava_refresh_token;
    const expiresAt = user.user_metadata?.strava_expires_at;

    if (!accessToken) throw new Error('Strava access token not found for user.');

    if (expiresAt && Date.now() / 1000 > expiresAt) {
        console.log('[process-strava-chunk] Strava token expired, attempting refresh for user:', userId);
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
            console.error('[process-strava-chunk] Failed to refresh Strava token. Status:', refreshResponse.status, 'Body:', errorBody);
            throw new Error(`Failed to refresh Strava token. Status: ${refreshResponse.status}`);
        }
        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;
        await supabase.auth.admin.updateUserById(userId, {
            user_metadata: {
                ...user.user_metadata,
                strava_access_token: refreshData.access_token,
                strava_refresh_token: refreshData.refresh_token || refreshToken,
                strava_expires_at: refreshData.expires_at
            }
        });
        console.log('[process-strava-chunk] Strava token refreshed successfully for user:', userId);
    }
    return accessToken;
}

// Helper: Fetch one page of activities from Strava - similar to fetch-activities.js
async function fetchActivitiesPage(accessToken, paginationParams) {
    const perPage = paginationParams.per_page || 50; // Default chunk size
    const page = paginationParams.page || 1;

    const stravaApiUrl = `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`;
    console.log('[process-strava-chunk] Calling Strava API URL:', stravaApiUrl);

    const activitiesResponse = await fetch(stravaApiUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!activitiesResponse.ok) {
        const errorBody = await activitiesResponse.text();
        console.error('[process-strava-chunk] Failed to fetch activities page from Strava. Status:', activitiesResponse.status, 'Body:', errorBody);
        throw new Error(`Failed to fetch activities page from Strava. Status: ${activitiesResponse.status}`);
    }
    const fetchedActivities = await activitiesResponse.json();
    // Filter for actual running activities and ensure they have latlng
    return fetchedActivities.filter(activity =>
        activity.type === 'Run' &&
        activity.start_latlng &&
        activity.start_latlng.length === 2
    );
}

// Helper: Call enrich-weather Netlify function
async function enrichActivitiesWithWeather(activities, eventOrigin) {
    if (!activities || activities.length === 0) return [];
    // Construct the full URL for the enrich-weather function
    const enrichWeatherUrl = `${eventOrigin}/.netlify/functions/enrich-weather`;
    console.log(`[process-strava-chunk] Calling enrich-weather function at ${enrichWeatherUrl} for ${activities.length} activities`);
    const response = await fetch(enrichWeatherUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // Add any necessary auth headers if enrich-weather is protected
        body: JSON.stringify({ activities }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[process-strava-chunk] Failed to enrich activities with weather. Status: ${response.status}, Response: ${errorText}`);
        throw new Error('Failed to enrich activities with weather');
    }
    const data = await response.json();
    return data.activities || [];
}

// Helper: Call save-runs Netlify function
async function saveActivitiesToDb(userId, activities, eventOrigin) {
    if (!activities || activities.length === 0) return { savedCount: 0, skippedCount: 0 };
    // Construct the full URL for the save-runs function
    const saveRunsUrl = `${eventOrigin}/.netlify/functions/save-runs`;
    console.log(`[process-strava-chunk] Calling save-runs function at ${saveRunsUrl} for ${activities.length} activities`);
    const response = await fetch(saveRunsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // Add any necessary auth headers if save-runs is protected
        body: JSON.stringify({ userId, activities }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[process-strava-chunk] Failed to save runs. Status: ${response.status}, Response: ${errorText}`);
        throw new Error('Failed to save runs');
    }
    const data = await response.json();
    return { savedCount: data.saved_count || 0, skippedCount: data.skipped_count || 0 };
}


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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing Supabase configuration');
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { userId, paginationParams } = JSON.parse(event.body);

    if (!userId) throw new Error('User ID is required.');
    if (!paginationParams || typeof paginationParams.page !== 'number') {
        throw new Error('Valid paginationParams with page number are required.');
    }

    // Determine the origin for calling other Netlify functions
    // For local dev, context.awsRequestId is not set, use a default or env var
    // For deployed Netlify, event.headers.host can be used, or event.rawUrl
    let eventOrigin = '';
    if (process.env.NETLIFY_DEV) { // Running locally with Netlify Dev
        // This might need to be set as an env var like NETLIFY_FUNCTIONS_ORIGIN or similar
        // or parsed from event if available. For now, assuming a common local dev port.
        // This is tricky because the port can change.
        // A more robust way for local dev is to invoke functions directly if sharing code.
        // For now, let's assume it's set, or this will fail locally.
        eventOrigin = process.env.URL || 'http://localhost:8888';
        console.warn(`[process-strava-chunk] Running in Netlify Dev, using origin: ${eventOrigin}. Ensure this is correct or set URL env var.`);
    } else { // Running deployed on Netlify
        // event.headers.host gives the domain. Prepend https://
        // Or, if functions are always at same root, can use relative paths if fetch allows.
        // It's safer to construct absolute URLs for fetch.
        const scheme = event.headers['x-forwarded-proto'] || 'https';
        eventOrigin = `${scheme}://${event.headers.host}`;
    }


    const accessToken = await getStravaAccessToken(supabase, userId);
    const activitiesFromStravaPage = await fetchActivitiesPage(accessToken, paginationParams);

    const processedActivityCount = activitiesFromStravaPage.length;
    let savedCount = 0;
    let skippedCount = 0;
    let isComplete = processedActivityCount < (paginationParams.per_page || 50);

    if (processedActivityCount > 0) {
        const enrichedActivities = await enrichActivitiesWithWeather(activitiesFromStravaPage, eventOrigin);
        const saveResult = await saveActivitiesToDb(userId, enrichedActivities, eventOrigin);
        savedCount = saveResult.savedCount;
        skippedCount = saveResult.skippedCount;
    } else {
        isComplete = true; // No activities found on this page, assume end of results
    }

    const nextPageParams = isComplete ? null : {
        page: (paginationParams.page || 1) + 1,
        per_page: paginationParams.per_page || 50
    };

    console.log(`[process-strava-chunk] Chunk processed for user ${userId}, page ${paginationParams.page}. Activities found: ${processedActivityCount}, Saved: ${savedCount}, Skipped: ${skippedCount}, IsComplete: ${isComplete}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        processedActivityCount,
        savedCount,
        skippedCount,
        nextPageParams,
        isComplete,
      }),
    };

  } catch (error) {
    console.error('[process-strava-chunk] Error:', error);
    return {
      statusCode: error.message.includes("User not found") ? 404 : 500, // More specific error for user not found
      headers,
      body: JSON.stringify({ message: error.message || 'Failed to process Strava activity chunk' }),
    };
  }
};
