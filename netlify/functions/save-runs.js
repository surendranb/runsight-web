// netlify/functions/save-runs.js
const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL; // VITE_SUPABASE_URL fallback is okay for URL
const SUPABASE_SERVICE_KEY_VAR = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY_VAR) {
    console.error('Missing Supabase URL or Service Key');
    console.log('SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Missing');
    console.log('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY_VAR ? 'Set' : 'Missing');
    throw new Error('Missing required Supabase URL or Service Key configuration for admin operations.');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY_VAR);

// Simple validation for run data
function isValidRun(run) {
    if (!run) {
        console.error('No run data provided');
        return false;
    }
    if (!run.strava_id) {
        console.error('Missing strava_id in run:', run);
        return false;
    }
    if (!run.user_id) {
        console.error('Missing user_id in run:', run);
        return false;
    }
    if (typeof run.distance !== 'number' || run.distance < 0) {
        console.error('Invalid distance in run:', run);
        return false;
    }
    if (!run.start_date) {
        console.error('Missing start_date in run:', run);
        return false;
    }
    return true;
}

exports.handler = async (event) => {
    console.log('[save-runs] Starting save-runs function');

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
            body: JSON.stringify({ error: 'Method not allowed. Please use POST.' }),
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
                body: JSON.stringify({ error: 'Invalid JSON in request body' })
            };
        }

        const { run, userId } = body;
        
        if (!run || !userId) {
            console.error('Missing run or userId in request. Body:', body);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Missing required parameters',
                    details: 'Both run and userId are required',
                    received: { hasRun: !!run, hasUserId: !!userId }
                })
            };
        }

        // Ensure the run has the user_id set
        const runToSave = { ...run };
        runToSave.user_id = userId;

        console.log(`[save-runs] Processing run ${run.id || 'unknown'} (strava_id: ${run.strava_id}) for user ${userId}`);

        // Validate the run
        if (!isValidRun(runToSave)) {
            console.error('Invalid run data:', runToSave);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid run data',
                    details: 'Run is missing required fields or has invalid values',
                    runFields: {
                        strava_id: runToSave.strava_id,
                        user_id: runToSave.user_id,
                        distance: runToSave.distance,
                        start_date: runToSave.start_date
                    }
                })
            };
        }

        // Check if run already exists
        console.log(`[save-runs] Checking if run ${runToSave.strava_id} exists for user ${userId}`);
        const { data: existingRun, error: fetchError } = await supabase
            .from('runs')
            .select('id, strava_id, name, start_date')
            .eq('strava_id', runToSave.strava_id)
            .eq('user_id', userId)
            .maybeSingle();

        if (fetchError) {
            console.error('Error checking for existing run:', fetchError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Database error checking for existing run',
                    details: fetchError.message,
                    code: fetchError.code
                })
            };
        }

        if (existingRun) {
            console.log(`[save-runs] Run ${runToSave.strava_id} already exists as run ID ${existingRun.id}`);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    saved: false,
                    skipped: true,
                    runId: existingRun.id,
                    message: 'Run already exists',
                    existingRun: {
                        id: existingRun.id,
                        name: existingRun.name,
                        start_date: existingRun.start_date
                    }
                })
            };
        }

        // Format start_latlng and end_latlng for PostgreSQL point type
        if (runToSave.start_latlng && Array.isArray(runToSave.start_latlng) && runToSave.start_latlng.length === 2) {
            const [lat, lng] = runToSave.start_latlng;
            if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
                runToSave.start_latlng = `(${lng},${lat})`; // Format as (longitude,latitude) string
            } else {
                console.warn(`[save-runs] Invalid lat/lng values in start_latlng for Strava ID ${runToSave.strava_id}:`, runToSave.start_latlng);
                runToSave.start_latlng = null; // Set to null if values are not valid numbers
            }
        } else if (runToSave.start_latlng) { // If it exists but isn't in the expected [lat,lng] format
            console.warn(`[save-runs] Unexpected format for start_latlng for Strava ID ${runToSave.strava_id}:`, runToSave.start_latlng);
            runToSave.start_latlng = null; // Nullify if format is unexpected
        } else {
            runToSave.start_latlng = null; // Ensure it's null if not present
        }

        if (runToSave.end_latlng && Array.isArray(runToSave.end_latlng) && runToSave.end_latlng.length === 2) {
            const [lat, lng] = runToSave.end_latlng;
            if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
                runToSave.end_latlng = `(${lng},${lat})`; // Format as (longitude,latitude) string
            } else {
                console.warn(`[save-runs] Invalid lat/lng values in end_latlng for Strava ID ${runToSave.strava_id}:`, runToSave.end_latlng);
                runToSave.end_latlng = null; // Set to null if values are not valid numbers
            }
        } else if (runToSave.end_latlng) { // If it exists but isn't in the expected [lat,lng] format
            console.warn(`[save-runs] Unexpected format for end_latlng for Strava ID ${runToSave.strava_id}:`, runToSave.end_latlng);
            runToSave.end_latlng = null; // Nullify if format is unexpected
        } else {
            runToSave.end_latlng = null; // Ensure it's null if not present
        }

        // Insert the new run
        console.log(`[save-runs] Inserting new run ${runToSave.strava_id} for user ${userId}. LatLngs: start=${runToSave.start_latlng}, end=${runToSave.end_latlng}`);
        const { data: savedRun, error: saveError } = await supabase
            .from('runs')
            .insert(runToSave)
            .select()
            .single();

        if (saveError) {
            console.error('Error saving run:', saveError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Failed to save run to database',
                    details: saveError.message,
                    code: saveError.code,
                    runData: {
                        strava_id: runToSave.strava_id,
                        name: runToSave.name,
                        start_date: runToSave.start_date,
                        distance: runToSave.distance
                    }
                })
            };
        }

        console.log(`[save-runs] Successfully saved run ${savedRun.id} (strava_id: ${savedRun.strava_id})`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                saved: true,
                runId: savedRun.id,
                strava_id: savedRun.strava_id,
                name: savedRun.name,
                start_date: savedRun.start_date
            })
        };
        
    } catch (error) {
        console.error('[save-runs] Unhandled error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};
