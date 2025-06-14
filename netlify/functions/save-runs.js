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

// Helper function to validate run data
function validateRun(run) {
    if (!run || typeof run !== 'object') return false;
    return (
        run.strava_id && 
        run.user_id && 
        typeof run.distance === 'number' && 
        run.distance >= 0 &&
        run.start_date &&
        run.type === 'Run'
    );
}

exports.handler = async (event) => {
    console.log('[save-runs] Starting save-runs function');

    const headers = {
        'Access-Control-Allow-Origin': '*',
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

    try {
        const { runs, userId } = JSON.parse(event.body);
        
        if (!runs || !Array.isArray(runs) || !userId) {
            throw new Error('Invalid request: Missing required parameters');
        }
        
        console.log(`[save-runs] Processing ${runs.length} runs for user ${userId}`);
        
        // Validate all runs first
        const validRuns = runs.filter(validateRun);
        if (validRuns.length !== runs.length) {
            console.warn(`[save-runs] Filtered out ${runs.length - validRuns.length} invalid runs`);
        }

        if (validRuns.length === 0) {
            console.log('[save-runs] No valid runs to process');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    savedCount: 0,
                    skippedCount: 0,
                    totalProcessed: 0
                })
            };
        }

        // Get existing Strava IDs in chunks to avoid URL length issues
        const stravaIds = [...new Set(validRuns.map(r => r.strava_id))];
        const chunkSize = 100;
        const existingIds = new Set();
        
        console.log(`[save-runs] Checking for existing runs in ${Math.ceil(stravaIds.length / chunkSize)} chunks`);
        
        for (let i = 0; i < stravaIds.length; i += chunkSize) {
            const chunk = stravaIds.slice(i, i + chunkSize);
            const { data: existingChunk, error } = await supabase
                .from('runs')
                .select('strava_id')
                .eq('user_id', userId)
                .in('strava_id', chunk);
                
            if (error) throw error;
            
            existingChunk.forEach(run => existingIds.add(run.strava_id));
        }
        
        // Filter out existing runs
        const newRuns = validRuns.filter(run => !existingIds.has(run.strava_id));
        console.log(`[save-runs] Found ${newRuns.length} new runs to save (${existingIds.size} already exist)`);

        // Insert in chunks to avoid hitting limits
        const insertChunkSize = 50;
        let savedCount = 0;
        let insertedRuns = [];
        
        console.log(`[save-runs] Inserting ${newRuns.length} runs in chunks of ${insertChunkSize}`);
        
        for (let i = 0; i < newRuns.length; i += insertChunkSize) {
            const chunk = newRuns.slice(i, i + insertChunkSize);
            const { data: chunkResults, error: chunkError } = await supabase
                .from('runs')
                .insert(chunk)
                .select();
                
            if (chunkError) {
                console.error(`[save-runs] Error inserting chunk ${i / insertChunkSize + 1}:`, chunkError);
                throw chunkError;
            }
            
            savedCount += chunkResults.length;
            insertedRuns = [...insertedRuns, ...chunkResults];
            console.log(`[save-runs] Inserted ${chunkResults.length} runs (${savedCount}/${newRuns.length} total)`);
        }

        const result = {
            savedCount,
            skippedCount: validRuns.length - newRuns.length,
            totalProcessed: validRuns.length
        };
        
        console.log('[save-runs] Sync complete:', result);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };
        
    } catch (error) {
        console.error('[save-runs] Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Failed to save runs',
                details: error.message 
            })
        };
    }
};
