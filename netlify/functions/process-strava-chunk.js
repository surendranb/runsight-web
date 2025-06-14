// netlify/functions/process-strava-chunk.js
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL; // VITE_SUPABASE_URL fallback is okay for URL if it's also used by client
const SUPABASE_SERVICE_KEY_VAR = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY_VAR) {
    console.error('Missing Supabase URL or Service Key');
    console.log('SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Missing');
    console.log('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY_VAR ? 'Set' : 'Missing');
    throw new Error('Missing required Supabase URL or Service Key configuration for admin operations.');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY_VAR);

// Helper function to fetch activities for a user from Strava
async function fetchStravaActivities(userId, paginationParams = {}) {
    console.log(`[process-strava-chunk] Fetching Strava activities for user ${userId} with params:`, paginationParams);
    
    console.log(`[process-strava-chunk] Fetching Strava activities for user ${userId} with params:`, paginationParams);
    
    try {
        // New Token Retrieval and Refresh Logic
        const { data: userAuthData, error: authUserError } = await supabase.auth.admin.getUserById(userId);

        if (authUserError || !userAuthData || !userAuthData.user) {
            console.error(`[process-strava-chunk/fetchStravaActivities] User not found or error fetching auth user for ID ${userId}:`, authUserError);
            throw new Error(`User not found or error fetching auth user: ${authUserError?.message || 'Unknown error'}`);
        }
        const authUser = userAuthData.user;
        let accessToken = authUser.user_metadata?.strava_access_token;
        const refreshToken = authUser.user_metadata?.strava_refresh_token;
        const expiresAt = authUser.user_metadata?.strava_expires_at;

        if (!accessToken || !refreshToken) {
            console.error(`[process-strava-chunk/fetchStravaActivities] Strava access or refresh token not found for user ${userId}.`);
            throw new Error('Strava token not found for user. Please re-authenticate.');
        }

        if (expiresAt && (Date.now() / 1000) > expiresAt) {
            console.log(`[process-strava-chunk/fetchStravaActivities] Strava token expired for user ${userId}, attempting refresh.`);
            const { VITE_STRAVA_CLIENT_ID: STRAVA_CLIENT_ID, VITE_STRAVA_CLIENT_SECRET: STRAVA_CLIENT_SECRET } = process.env;

            if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
                console.error('[process-strava-chunk/fetchStravaActivities] Missing Strava client ID or secret for token refresh.');
                throw new Error('Server configuration error: Strava client credentials missing for token refresh.');
            }

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
                const errorBody = await refreshResponse.json().catch(() => ({ message: 'Failed to refresh Strava token, and error response was not JSON.' }));
                console.error(`[process-strava-chunk/fetchStravaActivities] Failed to refresh Strava token for user ${userId}. Status: ${refreshResponse.status}`, errorBody);
                throw new Error(`Failed to refresh Strava token: ${errorBody.message || refreshResponse.statusText}`);
            }

            const refreshData = await refreshResponse.json();
            accessToken = refreshData.access_token;

            const newMetadata = {
                ...authUser.user_metadata,
                strava_access_token: refreshData.access_token,
                strava_refresh_token: refreshData.refresh_token || refreshToken, // Keep old refresh token if new one isn't provided
                strava_expires_at: refreshData.expires_at,
            };

            const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
                user_metadata: newMetadata,
            });

            if (updateError) {
                console.error(`[process-strava-chunk/fetchStravaActivities] Failed to update user ${userId} with new Strava tokens:`, updateError);
                // Log error but proceed with the new token for this session.
            } else {
                console.log(`[process-strava-chunk/fetchStravaActivities] Strava token refreshed and updated successfully for user ${userId}.`);
            }
        }
        
        // Build the Strava API URL with pagination parameters
        const url = new URL('https://www.strava.com/api/v3/athlete/activities');
        
        // Set default pagination if not provided
        const defaultParams = {
            page: 1,
            per_page: 10, // Process smaller batches
            ...paginationParams
        };
    
        // Add all parameters to the URL
        Object.entries(defaultParams).forEach(([key, value]) => {
            if (value !== undefined) {
                url.searchParams.append(key, value.toString());
            }
        });
        
        console.log(`[process-strava-chunk] Fetching from URL: ${url.toString()}`);
        
        try {
            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${accessToken}` // Ensure this uses the potentially refreshed token
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[process-strava-chunk] Error fetching activities: ${response.status} ${response.statusText}`, errorText);
                throw new Error(`Failed to fetch activities: ${response.status} ${response.statusText}`);
            }
            
            const activities = await response.json();
            console.log(`[process-strava-chunk] Fetched ${activities.length} activities from Strava`);
            
            // Filter for runs only and add user_id
            const runs = activities
                .filter(activity => activity.type === 'Run')
                .map(run => ({
                    ...run,
                    user_id: userId,
                    strava_id: run.id,
                    strava_data: run // Store the full Strava data
                }));
            
            console.log(`[process-strava-chunk] Filtered to ${runs.length} runs`);
            
            return {
                runs,
                nextPage: activities.length > 0 ? {
                    ...defaultParams,
                    page: defaultParams.page + 1
                } : null
            };
        } catch (error) {
            console.error('[process-strava-chunk] Error in fetchStravaActivities:', error);
            throw new Error(`Failed to fetch activities: ${error.message}`);
        }
    } catch (error) {
        console.error('[process-strava-chunk] Error in fetchStravaActivities (outer):', error);
        throw error; // Re-throw the error to be handled by the caller
    }
}

// Helper function to save a single run to the database
async function saveRun(userId, run) {
    console.log(`[process-strava-chunk] Saving run ${run.strava_id} for user ${userId}`);
    
    try {
        // Ensure the run has the correct user_id
        const runToSave = { ...run };
        
        // Determine the base URL based on environment
        const baseUrl = process.env.URL || 'http://localhost:8888';
        const endpoint = `${baseUrl}/.netlify/functions/save-runs`;
        
        console.log(`[process-strava-chunk] Calling save-runs endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                userId,
                run: runToSave 
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            console.error(`[process-strava-chunk] Error saving run ${run.strava_id}:`, result);
            return { 
                saved: false, 
                error: result.error || 'Unknown error',
                details: result.details || {},
                runId: run.strava_id
            };
        }
        
        console.log(`[process-strava-chunk] Successfully processed run ${run.strava_id}:`, 
            result.saved ? 'Saved' : 'Skipped (already exists)');
            
        return { 
            saved: result.saved || false,
            skipped: result.skipped || false,
            runId: result.runId || run.strava_id,
            name: run.name,
            start_date: run.start_date
        };
        
    } catch (error) {
        console.error(`[process-strava-chunk] Exception saving run ${run.strava_id}:`, error);
        return {
            saved: false,
            error: 'Exception saving run',
            details: error.message,
            runId: run.strava_id
        };
    }
}

// Helper function to save runs one at a time
async function saveRuns(userId, runs) {
    if (!runs || runs.length === 0) {
        console.log('[process-strava-chunk] No runs to save');
        return { 
            savedCount: 0, 
            skippedCount: 0, 
            individualSaveFailuresCount: 0,
            results: []
        };
    }
    
    console.log(`[process-strava-chunk] Processing ${runs.length} runs one at a time`);
    
    let savedCount = 0;
    let skippedCount = 0;
    let individualSaveFailuresCount = 0;
    const results = [];
    
    // Process each run one at a time
    for (const run of runs) {
        try {
            const result = await saveRun(userId, run);
            results.push(result);
            
            if (result.saved) {
                savedCount++;
            } else if (result.skipped) {
                skippedCount++;
            } else {
                individualSaveFailuresCount++;
            }
            
            // Small delay to avoid rate limiting (100ms between requests)
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.error(`[process-strava-chunk] Error processing run ${run.strava_id}:`, error);
            individualSaveFailuresCount++;
            results.push({
                saved: false,
                error: error.message,
                runId: run.strava_id,
                name: run.name
            });
        }
    }
    
    console.log(`[process-strava-chunk] Processed ${runs.length} runs: ${savedCount} saved, ${skippedCount} skipped, ${individualSaveFailuresCount} failed`);
    
    return { 
        savedCount, 
        skippedCount, 
        individualSaveFailuresCount,
        results
    };
}

// Main handler function
exports.handler = async (event) => {
    console.log('[process-strava-chunk] Starting function');
    
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
        'Content-Type': 'application/json',
    };
    
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
    
    try {
        // Parse the request body
        let body;
        try {
            body = JSON.parse(event.body);
        } catch (e) {
            console.error('Error parsing request body:', e);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid JSON in request body',
                    details: e.message
                })
            };
        }
        
        const { userId, paginationParams = {} } = body;
        
        if (!userId) {
            throw new Error('Missing required parameter: userId');
        }
        
        console.log(`[process-strava-chunk] Processing chunk for user ${userId} with params:`, paginationParams);
        
        // Fetch activities from Strava
        const { runs, nextPage } = await fetchStravaActivities(userId, paginationParams);
        
        // If no runs found, return early
        if (runs.length === 0) {
            console.log('[process-strava-chunk] No runs found in this chunk');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    processedActivityCount: 0,
                    rawActivityCountOnPage: 0,
                    savedCount: 0,
                    skippedCount: 0,
                    individualSaveFailuresCount: 0,
                    nextPageParams: null,
                    isComplete: true,
                    processedCount: 0,
                    totalProcessed: 0
                })
            };
        }
        
        // Attempt to enrich runs with weather data
        let enrichedRuns = runs; // Default to original runs
        if (runs.length > 0) {
            console.log(`[process-strava-chunk] Attempting to enrich ${runs.length} runs with weather data.`);
            try {
                const enrichmentUrl = `${process.env.URL || 'http://localhost:8888'}/.netlify/functions/enrich-weather`;
                const enrichmentResponse = await fetch(enrichmentUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ activities: runs }),
                });

                if (enrichmentResponse.ok) {
                    const enrichmentResult = await enrichmentResponse.json();
                    if (enrichmentResult.success && enrichmentResult.activities) {
                        enrichedRuns = enrichmentResult.activities;
                        console.log(`[process-strava-chunk] Successfully enriched activities. Enriched count: ${enrichmentResult.enriched_count}, Geocoded count: ${enrichmentResult.geocoded_count}`);
                    } else {
                        console.warn('[process-strava-chunk] Weather enrichment call succeeded but returned non-success or no activities. Proceeding with un-enriched data for this batch.', enrichmentResult);
                    }
                } else {
                    const errorBody = await enrichmentResponse.text(); // Use text() in case of non-JSON error
                    console.error(`[process-strava-chunk] Weather enrichment function call failed with status ${enrichmentResponse.status}. Response: ${errorBody.substring(0, 500)}. Proceeding with un-enriched data for this batch.`);
                }
            } catch (enrichError) {
                console.error('[process-strava-chunk] Exception during weather enrichment call:', enrichError.message, '. Proceeding with un-enriched data for this batch.');
            }
        }

        // Save runs to the database one at a time (using potentially enriched runs)
        const { 
            savedCount, 
            skippedCount, 
            individualSaveFailuresCount = 0,
            results = []
        } = await saveRuns(userId, enrichedRuns); // Use enrichedRuns here
        
        // Log summary of results
        const successfulSaves = results.filter(r => r.saved).length;
        const skips = results.filter(r => r.skipped).length;
        const failures = results.filter(r => !r.saved && !r.skipped).length;
        
        console.log(`[process-strava-chunk] Processed ${runs.length} runs: ${successfulSaves} saved, ${skips} skipped, ${failures} failed`);
        
        // Determine if we should continue pagination
        const isComplete = !nextPage || runs.length === 0;
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                processedActivityCount: runs.length,
                rawActivityCountOnPage: runs.length,
                savedCount,
                skippedCount,
                individualSaveFailuresCount,
                nextPageParams: isComplete ? null : nextPage,
                isComplete,
                processedCount: runs.length,
                totalProcessed: runs.length,
                // Include a summary for debugging
                _summary: {
                    totalRuns: runs.length,
                    successfulSaves,
                    skips,
                    failures,
                    firstRun: runs[0] ? {
                        id: runs[0].id,
                        name: runs[0].name,
                        start_date: runs[0].start_date,
                        distance: runs[0].distance
                    } : null,
                    lastRun: runs.length > 1 ? {
                        id: runs[runs.length - 1].id,
                        name: runs[runs.length - 1].name,
                        start_date: runs[runs.length - 1].start_date,
                        distance: runs[runs.length - 1].distance
                    } : null
                }
            })
        };
        
    } catch (error) {
        console.error('[process-strava-chunk] Unhandled error:', error);
        
        // Include the error stage in the response for better debugging
        let errorStage = 'unknown';
        if (error.message.includes('fetching activities')) errorStage = 'fetch_activities';
        else if (error.message.includes('saving runs')) errorStage = 'save_runs';
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to process Strava activities',
                message: error.message,
                stage: errorStage,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                details: {
                    name: error.name,
                    code: error.code
                }
            })
        };
    }
};
