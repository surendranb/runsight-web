// netlify/functions/save-runs.js
const { createClient } = require('@supabase/supabase-js');

// Get environment variables with fallbacks
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase configuration');
    console.log('SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Missing');
    console.log('SUPABASE_KEY:', SUPABASE_KEY ? 'Set' : 'Missing');
    throw new Error('Missing required Supabase configuration');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

        // Insert the new run
        console.log(`[save-runs] Inserting new run ${runToSave.strava_id} for user ${userId}`);
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
