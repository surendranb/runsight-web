// netlify/functions/process-strava-chunk.js
const fetch = require('node-fetch'); // For calling other Netlify functions

// NOTE: This version assumes that getStravaAccessToken logic (including token refresh)
// is self-contained or handled by the 'fetch-activities' function itself,
// so 'process-strava-chunk' doesn't directly handle Supabase client for tokens here.
// If 'fetch-activities' requires userId to get tokens, this is fine.

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

  let errorStage = 'STAGE_INITIALIZATION';
  let userIdForLogging = 'UnknownUser';

  try {
    const body = JSON.parse(event.body);
    const { userId, paginationParams } = body;

    if (userId) userIdForLogging = userId;
    // console.log(`[process-strava-chunk] Function Entry for user ${userIdForLogging}. Received paginationParams:`, JSON.stringify(paginationParams));
    // ADDED LOGGING for initial params:
    console.log(`[process-strava-chunk-DEBUG] Invoked with paginationParams: page=${paginationParams.page}, per_page=${paginationParams.per_page}, after=${paginationParams.after ? new Date(paginationParams.after * 1000).toISOString() : 'N/A'}, before=${paginationParams.before ? new Date(paginationParams.before * 1000).toISOString() : 'N/A'}`);


    if (!userId) {
      console.error('[process-strava-chunk] User ID is missing from request body.');
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'User ID is required.' }) };
    }
    if (!paginationParams || typeof paginationParams.page !== 'number') {
      console.error('[process-strava-chunk] Valid paginationParams with page number are required. Received:', paginationParams);
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid paginationParams with page number are required.' }) };
    }

    errorStage = 'STAGE_DETERMINE_ORIGIN';
    let eventOrigin = '';
    if (process.env.NETLIFY_DEV || process.env.CONTEXT === 'dev') { // Check Netlify dev context
      eventOrigin = process.env.URL || 'http://localhost:8888'; // process.env.URL is Netlify's standard for the site's URL during build/deploy previews
      if (event.headers.host.includes('localhost')) eventOrigin = 'http://localhost:8888'; // More reliable for local dev if URL is not set
      console.warn(`[process-strava-chunk] Running in Dev, using origin: ${eventOrigin}`);
    } else {
      const scheme = event.headers['x-forwarded-proto'] || 'https';
      eventOrigin = `${scheme}://${event.headers.host}`;
      console.log(`[process-strava-chunk] Running deployed on Netlify, determined origin: ${eventOrigin}`);
    }

    // Step 1: Fetch activities for the current chunk
    errorStage = 'STAGE_FETCH_ACTIVITIES';
    console.log(`[process-strava-chunk] Calling fetch-activities for user ${userId}, params: ${JSON.stringify(paginationParams)}`);
    const fetchResponse = await fetch(`${eventOrigin}/.netlify/functions/fetch-activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // Add Auth header if fetch-activities is protected
      body: JSON.stringify({ userId, params: paginationParams }),
    });

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      console.error(`[process-strava-chunk] Call to fetch-activities failed. Status: ${fetchResponse.status}, Response: ${errorText}`);
      throw new Error(`Failed to fetch activities (status ${fetchResponse.status}): ${errorText.substring(0, 200)}`);
    }
    const fetchResult = await fetchResponse.json();
    const activitiesToProcess = fetchResult.activities || [];
    const rawActivityCountOnPage = fetchResult.rawCountThisPage || 0; // From fetch-activities response
    // ADDED LOGGING for fetch result:
    console.log(`[process-strava-chunk-DEBUG] Page ${paginationParams.page}: fetch-activities rawCountThisPage=${rawActivityCountOnPage}, processedRunsToEnrich=${activitiesToProcess.length}`);
    const processedRunCount = activitiesToProcess.length; // Runs with latlng

    // console.log(`[process-strava-chunk] fetch-activities returned ${processedRunCount} runs to process (raw on page: ${rawActivityCountOnPage}).`); // Original log, can be removed or kept

    let enrichedActivities = activitiesToProcess;
    if (processedRunCount > 0) {
      // Step 2: Enrich activities with weather
      errorStage = 'STAGE_ENRICH_WEATHER';
      console.log(`[process-strava-chunk] Calling enrich-weather for ${processedRunCount} activities.`);
      const enrichResponse = await fetch(`${eventOrigin}/.netlify/functions/enrich-weather`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // Add Auth if needed
        body: JSON.stringify({ activities: activitiesToProcess }),
      });

      if (!enrichResponse.ok) {
        const errorText = await enrichResponse.text();
        console.warn(`[process-strava-chunk] Call to enrich-weather failed. Status: ${enrichResponse.status}, Response: ${errorText}. Proceeding with un-enriched activities for saving.`);
        // Don't throw, allow saving of un-enriched data if weather fails
      } else {
        const enrichResult = await enrichResponse.json();
        enrichedActivities = enrichResult.activities || activitiesToProcess; // Use enriched if successful
        console.log(`[process-strava-chunk] enrich-weather returned (enriched: ${enrichResult.enriched_count}, geocoded: ${enrichResult.geocoded_count}).`);
      }
    }

    // Step 3: Save activities to DB
    let savedCount = 0;
    let skippedCount = 0;
    let individualSaveFailuresCount = 0;

    if (enrichedActivities.length > 0) { // Note: this is based on count *before* enrichment if enrichment failed
      errorStage = 'STAGE_SAVE_TO_DB';
      console.log(`[process-strava-chunk] Calling save-runs for ${enrichedActivities.length} activities.`);
      const saveResponse = await fetch(`${eventOrigin}/.netlify/functions/save-runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // Add Auth if needed
        body: JSON.stringify({ userId, activities: enrichedActivities }),
      });

      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        console.error(`[process-strava-chunk] Call to save-runs failed. Status: ${saveResponse.status}, Response: ${errorText}`);
        // Consider if this should be a hard throw or if we can proceed if some were saved before a timeout etc.
        // For now, if save-runs itself fails at this top level, we throw. Internal errors in save-runs are handled by it.
        throw new Error(`Failed to save runs (status ${saveResponse.status}): ${errorText.substring(0,200)}`);
      }
      const saveResult = await saveResponse.json();
      savedCount = saveResult.saved_count || 0;
      skippedCount = saveResult.skipped_count || 0;
      individualSaveFailuresCount = saveResult.individual_save_failures_count || 0;
      console.log(`[process-strava-chunk] save-runs completed. Saved: ${savedCount}, Skipped: ${skippedCount}, Failures: ${individualSaveFailuresCount}`);
    } else {
      console.log('[process-strava-chunk] No activities to save after fetch/enrich steps.');
    }

    errorStage = 'STAGE_PREPARE_RESPONSE';
    // Determine if this was the last page based on raw activities fetched vs. per_page requested
    // If fewer raw activities were returned by Strava than requested, it's the last page for this time range.
    const perPageRequested = paginationParams.per_page || 50;
    const isComplete = rawActivityCountOnPage < perPageRequested;
    // ADDED LOGGING for completion check:
    console.log(`[process-strava-chunk-DEBUG] Page ${paginationParams.page}: Completion check: rawActivityCountOnPage=${rawActivityCountOnPage}, perPageRequested=${perPageRequested}, isComplete=${isComplete}`);

    const nextPagePayload = {
      page: (paginationParams.page || 1) + 1,
      per_page: perPageRequested,
      // Carry forward after and before timestamps
      ...(typeof paginationParams.after === 'number' && { after: paginationParams.after }),
      ...(typeof paginationParams.before === 'number' && { before: paginationParams.before }),
    };
    const nextPageParams = isComplete ? null : nextPagePayload;
    // ADDED LOGGING for next page params
    if (nextPageParams) {
        console.log(`[process-strava-chunk-DEBUG] Page ${paginationParams.page}: Next page params generated: page=${nextPageParams.page}, after=${nextPageParams.after ? new Date(nextPageParams.after * 1000).toISOString() : 'N/A'}, before=${nextPageParams.before ? new Date(nextPageParams.before * 1000).toISOString() : 'N/A'}`);
    } else {
        console.log(`[process-strava-chunk-DEBUG] Page ${paginationParams.page}: No next page. Sync for this period should be complete.`);
    }

    const responseBody = {
      processedRunCount: processedRunCount, // Number of runs with latlng from fetch-activities
      rawActivityCountOnPage: rawActivityCountOnPage, // Raw from Strava this page
      savedCount: savedCount,
      skippedCount: skippedCount,
      individualSaveFailuresCount: individualSaveFailuresCount,
      nextPageParams: nextPageParams,
      isComplete: isComplete,
    };

    console.log(`[process-strava-chunk] Chunk processing complete for user ${userIdForLogging}, page ${paginationParams.page}. Results: ${JSON.stringify(responseBody)}`);
    return { statusCode: 200, headers, body: JSON.stringify(responseBody) };

  } catch (error) {
    console.error(`[process-strava-chunk] ERROR at ${errorStage} for user ${userIdForLogging}:`, error.message, error.stack ? error.stack.substring(0, 500) : 'No stack');
    return {
      statusCode: 500, // Or more specific based on error type/stage
      headers,
      body: JSON.stringify({
        message: `An error occurred at stage: ${errorStage}. ${error.message}`,
        errorDetails: error.toString().substring(0, 1000),
        stage: errorStage,
      }),
    };
  }
};
