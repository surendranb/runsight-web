// netlify/functions/process-strava-chunk.js
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch'); // Required for making HTTP requests

// Helper: Get Strava Access Token (with refresh logic) - similar to fetch-activities.js
async function getStravaAccessToken(supabase, userId) {
    console.log(`[process-strava-chunk] getStravaAccessToken called for userId: ${userId}`);
    const { data: userAuthData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userAuthData || !userAuthData.user) {
        console.error('[process-strava-chunk] User not found or error fetching user:', userError);
        const err = new Error(`User not found: ${userError?.message}`);
        err.isUserNotFoundError = true;
        throw err;
    }
    const user = userAuthData.user;
    let accessToken = user.user_metadata?.strava_access_token;
    const refreshToken = user.user_metadata?.strava_refresh_token;
    const expiresAt = user.user_metadata?.strava_expires_at;

    if (!accessToken) {
        console.error('[process-strava-chunk] Strava access token not found for user metadata:', user.user_metadata);
        const err = new Error('Strava access token not found for user.');
        err.isTokenNotFoundError = true;
        throw err;
    }

    if (expiresAt && Date.now() / 1000 > expiresAt) {
        console.log(`[process-strava-chunk] Strava token expired for user: ${userId}. Current time: ${new Date(Date.now()).toISOString()}, Expires at: ${new Date(expiresAt * 1000).toISOString()}. Attempting refresh.`);
        const refreshParams = {
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        };
        console.log('[process-strava-chunk] Initiating Strava token refresh with params:', { client_id: refreshParams.client_id, grant_type: 'refresh_token' }); // Avoid logging secret/token

        const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(refreshParams)
        });
        if (!refreshResponse.ok) {
            const errorBody = await refreshResponse.text();
            console.error(`[process-strava-chunk] Failed to refresh Strava token for user ${userId}. Status: ${refreshResponse.status}, Body: ${errorBody}`);
            const err = new Error(`Failed to refresh Strava token. Status: ${refreshResponse.status}`);
            err.isStravaApiError = true;
            err.stravaApiStatus = refreshResponse.status;
            err.details = errorBody.substring(0, 500); // Truncate
            throw err;
        }
        const refreshData = await refreshResponse.json();
        console.log(`[process-strava-chunk] Strava token refreshed successfully for user: ${userId}. New expiry: ${new Date(refreshData.expires_at * 1000).toISOString()}`);
        accessToken = refreshData.access_token;
        await supabase.auth.admin.updateUserById(userId, {
            user_metadata: {
                ...user.user_metadata,
                strava_access_token: refreshData.access_token,
                strava_refresh_token: refreshData.refresh_token || refreshToken,
                strava_expires_at: refreshData.expires_at
            }
        });
    } else if (expiresAt) {
        console.log(`[process-strava-chunk] Strava token for user ${userId} is still valid. Expires at: ${new Date(expiresAt * 1000).toISOString()}`);
    } else {
        console.log(`[process-strava-chunk] Strava token for user ${userId} does not have an expiry time set, assuming valid.`);
    }
    return accessToken;
}

// Helper: Fetch one page of activities from Strava - similar to fetch-activities.js
async function fetchActivitiesPage(accessToken, paginationParams) {
    const { page = 1, per_page = 50, after, before } = paginationParams;

    let stravaApiUrl = `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${per_page}`;
    if (typeof after === 'number') { // Check type to correctly handle timestamp 0
        stravaApiUrl += `&after=${after}`;
    }
    if (typeof before === 'number') { // Check type
        stravaApiUrl += `&before=${before}`;
    }
    // Log the fully constructed URL and the parameters it was built from
    console.log('[process-strava-chunk] Calling fetchActivitiesPage with effective params:',
                JSON.stringify({ page, per_page, after, before }), 'Generated URL:', stravaApiUrl);

    const activitiesResponse = await fetch(stravaApiUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!activitiesResponse.ok) {
        const errorBody = await activitiesResponse.text();
        console.error('[process-strava-chunk] Failed to fetch activities page from Strava. Status:', activitiesResponse.status, 'Body:', errorBody);
        const err = new Error(`Failed to fetch activities page from Strava. Status: ${activitiesResponse.status}`);
        err.isStravaApiError = true;
        err.stravaApiStatus = activitiesResponse.status;
        err.details = errorBody.substring(0, 500); // Truncate
        throw err;
    }
    const rawActivities = await activitiesResponse.json(); // Renamed for clarity
    console.log(`[process-strava-chunk] fetchActivitiesPage: Raw activities received from Strava: ${rawActivities.length}`);

    const filteredRunActivities = rawActivities.filter(activity =>
        activity.type === 'Run' &&
        activity.start_latlng &&
        activity.start_latlng.length === 2
    );
    console.log(`[process-strava-chunk] Filtered run activities with latlng: ${filteredRunActivities.length}`);
    return {
        filteredRuns: filteredRunActivities,
        rawActivityCount: rawActivities.length
    };
}

// Helper: Call enrich-weather Netlify function
async function enrichActivitiesWithWeather(activities, eventOrigin) {
    if (!activities || activities.length === 0) {
        console.log('[process-strava-chunk] enrichActivitiesWithWeather: No activities to enrich.');
        return [];
    }
    // Construct the full URL for the enrich-weather function
    const enrichWeatherUrl = `${eventOrigin}/.netlify/functions/enrich-weather`;
    console.log(`[process-strava-chunk] Calling enrichActivitiesWithWeather for ${activities.length} activities. Target URL: ${enrichWeatherUrl}`);
    const response = await fetch(enrichWeatherUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // Add any necessary auth headers if enrich-weather is protected
        body: JSON.stringify({ activities }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[process-strava-chunk] enrichActivitiesWithWeather failed. Status: ${response.status}, Response: ${errorText}, URL: ${enrichWeatherUrl}`);
        const err = new Error(`Failed to enrich activities with weather. Status: ${response.status}`);
        err.isEnrichWeatherError = true;
        err.details = errorText.substring(0, 500); // Truncate
        throw err;
    }
    const data = await response.json();
    const enrichedCount = data.activities ? data.activities.length : 0;
    console.log(`[process-strava-chunk] enrichActivitiesWithWeather successful. Enriched activities count: ${enrichedCount}`);
    return data.activities || [];
}

// Helper: Call save-runs Netlify function
async function saveActivitiesToDb(userId, activities, eventOrigin) {
    if (!activities || activities.length === 0) {
        console.log('[process-strava-chunk] saveActivitiesToDb: No activities to save.');
        return { savedCount: 0, skippedCount: 0, individualSaveFailuresCount: 0 }; // Include default for new field
    }
    // Construct the full URL for the save-runs function
    const saveRunsUrl = `${eventOrigin}/.netlify/functions/save-runs`;
    console.log(`[process-strava-chunk] Calling saveActivitiesToDb for ${activities.length} activities. Target URL: ${saveRunsUrl}`);
    const response = await fetch(saveRunsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // Add any necessary auth headers if save-runs is protected
        body: JSON.stringify({ userId, activities }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[process-strava-chunk] saveActivitiesToDb failed. Status: ${response.status}, Response: ${errorText}, URL: ${saveRunsUrl}`);
        const err = new Error(`Failed to save runs. Status: ${response.status}`);
        err.isSaveRunsError = true;
        err.details = errorText.substring(0, 500); // Truncate
        throw err;
    }
    const data = await response.json();
    // Log the new count as well
    console.log(`[process-strava-chunk] saveActivitiesToDb successful. Saved: ${data.saved_count || 0}, Skipped: ${data.skipped_count || 0}, SaveFailures: ${data.individual_save_failures_count || 0}`);
    return {
      savedCount: data.saved_count || 0,
      skippedCount: data.skipped_count || 0,
      individualSaveFailuresCount: data.individual_save_failures_count || 0 // Add this
    };
}


exports.handler = async (event, context) => {
  let errorStage = 'STAGE_INITIALIZATION';
  let userIdForLogging = 'UnknownUser';
  console.log('[process-strava-chunk] Function Entry. Received event body:', event.body);
  if (context && context.awsRequestId) {
    console.log(`[process-strava-chunk] Context awsRequestId: ${context.awsRequestId}`);
  }

  const headers = {
    'Access-Control-Allow-Origin': '*', // Adjust for production
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    console.log('[process-strava-chunk] Responding to OPTIONS request.');
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    console.warn(`[process-strava-chunk] Method not allowed: ${event.httpMethod}`);
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    errorStage = 'STAGE_SETUP_SUPABASE';
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('[process-strava-chunk] Supabase URL or Service Key is missing.');
      throw new Error('Missing Supabase configuration');
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log('[process-strava-chunk] Supabase client initialized.');

    errorStage = 'STAGE_PARSE_BODY';
    const { userId, paginationParams } = JSON.parse(event.body);
    if (userId) userIdForLogging = userId;
    console.log('[process-strava-chunk] Parsed event body. userId:', userIdForLogging, 'paginationParams:', JSON.stringify(paginationParams));


    if (!userId) {
      console.error('[process-strava-chunk] User ID is missing from request body.');
      throw new Error('User ID is required.');
    }
    if (!paginationParams || typeof paginationParams.page !== 'number') {
        console.error('[process-strava-chunk] Valid paginationParams with page number are required. Received:', paginationParams);
        throw new Error('Valid paginationParams with page number are required.');
    }

    errorStage = 'STAGE_DETERMINE_ORIGIN';
    // Determine the origin for calling other Netlify functions
    let eventOrigin = '';
    if (process.env.NETLIFY_DEV) {
        eventOrigin = process.env.URL || 'http://localhost:8888'; // process.env.URL is Netlify's standard for the site's URL
        console.warn(`[process-strava-chunk] Running in Netlify Dev, using origin from process.env.URL: ${eventOrigin}.`);
    } else {
        const scheme = event.headers['x-forwarded-proto'] || 'https';
        eventOrigin = `${scheme}://${event.headers.host}`;
        console.log(`[process-strava-chunk] Running deployed on Netlify, determined origin: ${eventOrigin}`);
    }
    console.log('[process-strava-chunk] Calculated eventOrigin:', eventOrigin);


    errorStage = 'STAGE_GET_STRAVA_TOKEN';
    const accessToken = await getStravaAccessToken(supabase, userId);

    errorStage = 'STAGE_FETCH_ACTIVITIES';
    const { filteredRuns, rawActivityCount } = await fetchActivitiesPage(accessToken, paginationParams);

    const processedActivityCount = filteredRuns.length; // Count of runs we will actually process
    let savedCount = 0;
    let skippedCount = 0;
    let individualSaveFailuresCount = 0; // Initialize new counter
    let isComplete = rawActivityCount < (paginationParams.per_page || 50);

    if (processedActivityCount > 0) {
        errorStage = 'STAGE_ENRICH_WEATHER';
        const enrichedActivities = await enrichActivitiesWithWeather(filteredRuns, eventOrigin);
        if (enrichedActivities.length > 0) {
            errorStage = 'STAGE_SAVE_TO_DB';
            const saveResult = await saveActivitiesToDb(userId, enrichedActivities, eventOrigin);
            savedCount = saveResult.savedCount;
            skippedCount = saveResult.skippedCount;
            individualSaveFailuresCount = saveResult.individualSaveFailuresCount; // Assign new count
        } else {
            console.log('[process-strava-chunk] No activities were enriched (either 0 filtered runs initially, or enricher returned 0), skipping save to DB.');
        }
    } else {
        console.log(`[process-strava-chunk] No runnable activities with latlng found on page ${paginationParams.page}. Raw activities on page: ${rawActivityCount}.`);
        if (rawActivityCount === 0) {
            isComplete = true;
            console.log(`[process-strava-chunk] Confirmed completion as rawActivityCount is 0.`);
        }
    }

    errorStage = 'STAGE_PREPARE_RESPONSE';
    const nextPagePayload: { page: number; per_page: number; after?: number; before?: number } = {
        page: (paginationParams.page || 1) + 1,
        per_page: paginationParams.per_page || 50,
    };

    if (paginationParams.hasOwnProperty('after') && typeof paginationParams.after === 'number') {
        nextPagePayload.after = paginationParams.after;
    }
    if (paginationParams.hasOwnProperty('before') && typeof paginationParams.before === 'number') {
        nextPagePayload.before = paginationParams.before;
    }

    const nextPageParams = isComplete ? null : nextPagePayload;

    const responseBody = {
      processedRunCount: processedActivityCount,
      rawActivityCountOnPage: rawActivityCount,
      savedCount: savedCount,
      skippedCount: skippedCount,
      individualSaveFailuresCount: individualSaveFailuresCount, // Add to response
      nextPageParams,
      isComplete,
    };

    console.log(`[process-strava-chunk] Chunk processing complete for user ${userIdForLogging}, page ${paginationParams.page}. Results: ${JSON.stringify(responseBody)}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseBody),
    };

  } catch (error) {
    console.error(`[process-strava-chunk] ERROR at ${errorStage} for user ${userIdForLogging}:`, error.message, error.stack ? error.stack.substring(0, 500) : 'No stack');

    let finalStatusCode = 500;
    let userMessage = 'An unexpected error occurred while processing your request.';

    // Determine finalStatusCode and userMessage based on errorStage and error properties
    if (errorStage === 'STAGE_INITIALIZATION' || errorStage === 'STAGE_SETUP_SUPABASE' || errorStage === 'STAGE_PARSE_BODY') {
        finalStatusCode = 400; // Bad Request for early stage errors
        userMessage = 'There was an issue with your request. Please check the input and try again.';
    } else if (error.isUserNotFoundError) {
        finalStatusCode = 404;
        userMessage = 'User not found. Please ensure you are properly authenticated.';
    } else if (error.isTokenNotFoundError || (error.isStravaApiError && error.stravaApiStatus === 401)) {
        finalStatusCode = 401;
        userMessage = 'Authentication failed. Please reconnect your Strava account.';
    } else if (error.isStravaApiError) {
        finalStatusCode = error.stravaApiStatus && typeof error.stravaApiStatus === 'number' ? error.stravaApiStatus : 502; // Use specific status or Bad Gateway
        userMessage = `Error communicating with Strava (status ${finalStatusCode}). Please try again later.`;
        if (finalStatusCode === 401) userMessage = 'Strava authentication failed. Please reconnect your account.';
    } else if (error.isEnrichWeatherError || error.isSaveRunsError) {
        finalStatusCode = 502; // Bad Gateway for dependent service failures
        userMessage = 'A dependent service failed to process your request. Please try again later.';
    }
    // Default is 500, userMessage already set

    return {
      statusCode: finalStatusCode,
      headers,
      body: JSON.stringify({
        message: userMessage,
        errorDetails: (error.details || error.toString()).substring(0,1000), // Truncate errorDetails
        stage: errorStage
      }),
    };
  }
};
