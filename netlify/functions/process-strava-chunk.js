// netlify/functions/process-strava-chunk.js
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch'); // Required for making HTTP requests

// Helper: Get Strava Access Token (with refresh logic) - similar to fetch-activities.js
async function getStravaAccessToken(supabase, userId) {
    console.log(`[process-strava-chunk] getStravaAccessToken called for userId: ${userId}`);
    const { data: userAuthData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userAuthData || !userAuthData.user) {
        console.error('[process-strava-chunk] User not found or error fetching user:', userError);
        throw new Error(`User not found: ${userError?.message}`);
    }
    const user = userAuthData.user;
    let accessToken = user.user_metadata?.strava_access_token;
    const refreshToken = user.user_metadata?.strava_refresh_token;
    const expiresAt = user.user_metadata?.strava_expires_at;

    if (!accessToken) {
        console.error('[process-strava-chunk] Strava access token not found for user metadata:', user.user_metadata);
        throw new Error('Strava access token not found for user.');
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
            throw new Error(`Failed to refresh Strava token. Status: ${refreshResponse.status}, Details: ${errorBody}`);
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
    const perPage = paginationParams.per_page || 50; // Default chunk size
    const page = paginationParams.page || 1;

    const stravaApiUrl = `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`;
    console.log('[process-strava-chunk] Calling fetchActivitiesPage with params:', JSON.stringify(paginationParams), 'URL:', stravaApiUrl);

    const activitiesResponse = await fetch(stravaApiUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!activitiesResponse.ok) {
        const errorBody = await activitiesResponse.text();
        console.error('[process-strava-chunk] Failed to fetch activities page from Strava. Status:', activitiesResponse.status, 'Body:', errorBody);
        throw new Error(`Failed to fetch activities page from Strava. Status: ${activitiesResponse.status}, Body: ${errorBody}`);
    }
    const fetchedActivities = await activitiesResponse.json();
    console.log(`[process-strava-chunk] fetchActivitiesPage successful. Raw activities fetched: ${fetchedActivities.length}`);
    // Filter for actual running activities and ensure they have latlng
    const filteredActivities = fetchedActivities.filter(activity =>
        activity.type === 'Run' &&
        activity.start_latlng &&
        activity.start_latlng.length === 2
    );
    console.log(`[process-strava-chunk] Filtered run activities with latlng: ${filteredActivities.length}`);
    return filteredActivities;
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
        throw new Error(`Failed to enrich activities with weather. Status: ${response.status}, Details: ${errorText}`);
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
        return { savedCount: 0, skippedCount: 0 };
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
        throw new Error(`Failed to save runs. Status: ${response.status}, Details: ${errorText}`);
    }
    const data = await response.json();
    console.log(`[process-strava-chunk] saveActivitiesToDb successful. Saved: ${data.saved_count || 0}, Skipped: ${data.skipped_count || 0}`);
    return { savedCount: data.saved_count || 0, skippedCount: data.skipped_count || 0 };
}


exports.handler = async (event, context) => {
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
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('[process-strava-chunk] Supabase URL or Service Key is missing.');
      throw new Error('Missing Supabase configuration');
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log('[process-strava-chunk] Supabase client initialized.');

    const { userId, paginationParams } = JSON.parse(event.body);
    console.log('[process-strava-chunk] Parsed event body. userId:', userId, 'paginationParams:', JSON.stringify(paginationParams));


    if (!userId) {
      console.error('[process-strava-chunk] User ID is missing from request body.');
      throw new Error('User ID is required.');
    }
    if (!paginationParams || typeof paginationParams.page !== 'number') {
        console.error('[process-strava-chunk] Valid paginationParams with page number are required. Received:', paginationParams);
        throw new Error('Valid paginationParams with page number are required.');
    }

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


    const accessToken = await getStravaAccessToken(supabase, userId);
    const activitiesFromStravaPage = await fetchActivitiesPage(accessToken, paginationParams);

    const processedActivityCount = activitiesFromStravaPage.length;
    let savedCount = 0;
    let skippedCount = 0;
    // Determine if this is the last page based on whether fewer activities were returned than requested
    // This is Strava's way of indicating the end of results.
    let isComplete = processedActivityCount < (paginationParams.per_page || 50);

    if (processedActivityCount > 0) {
        const enrichedActivities = await enrichActivitiesWithWeather(activitiesFromStravaPage, eventOrigin);
        if (enrichedActivities.length > 0) {
            const saveResult = await saveActivitiesToDb(userId, enrichedActivities, eventOrigin);
            savedCount = saveResult.savedCount;
            skippedCount = saveResult.skippedCount;
        } else {
            console.log('[process-strava-chunk] No activities were enriched, skipping save to DB.');
            // if no activities were enriched, it implies they might have been filtered out or an issue occurred.
            // We might still have processedActivityCount > 0 from Strava, but 0 enriched.
            // So, if enrich step returns 0, we should consider this "chunk" as processed for what could be saved.
        }
    } else {
        console.log(`[process-strava-chunk] No activities fetched from Strava for page ${paginationParams.page}, marking as complete.`);
        isComplete = true; // No activities found on this page, assume end of results
    }

    const nextPageParams = isComplete ? null : {
        page: (paginationParams.page || 1) + 1,
        per_page: paginationParams.per_page || 50
    };

    const responseBody = {
      processedActivityCount, // Number of activities fetched from Strava and filtered for type/latlng
      savedCount,             // Number of activities successfully saved to DB
      skippedCount,           // Number of activities skipped by DB (e.g., duplicates)
      nextPageParams,         // Params for the next chunk, or null if complete
      isComplete,             // Boolean indicating if this was the last page
    };

    console.log(`[process-strava-chunk] Chunk processing complete for user ${userId}, page ${paginationParams.page}. Results: ${JSON.stringify(responseBody)}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseBody),
    };

  } catch (error) {
    console.error('[process-strava-chunk] Unhandled error in main handler:', error); // Log the full error object
    return {
      statusCode: error.message && error.message.includes("User not found") ? 404 : 500,
      headers,
      body: JSON.stringify({
        message: error.message || 'Failed to process Strava activity chunk due to an internal error.',
        errorDetails: error.toString() // Include more error details if possible
      }),
    };
  }
};
