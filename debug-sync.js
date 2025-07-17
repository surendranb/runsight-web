// Debug script to test the exact same logic as sync-data.js
import { createClient } from '@supabase/supabase-js';

async function debugSync() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  console.log('Environment check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey
  });

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test 1: Can we connect to the database?
  console.log('\n=== Test 1: Database Connection ===');
  const { data: testData, error: testError } = await supabase
    .from('runs')
    .select('COUNT(*)')
    .single();
  
  console.log('Connection test:', { testData, testError });

  // Test 2: Check for a specific strava_id that should NOT exist
  console.log('\n=== Test 2: Non-existent Record Check ===');
  const testStravaId = 999999999; // This should not exist
  const { data: existingRuns, error: checkError } = await supabase
    .from('runs')
    .select('id')
    .eq('strava_id', testStravaId);

  console.log('Non-existent check:', { 
    existingRuns, 
    checkError,
    length: existingRuns?.length,
    existingRun: existingRuns && existingRuns.length > 0 ? existingRuns[0] : null
  });

  // Test 3: Check for the existing record
  console.log('\n=== Test 3: Existing Record Check ===');
  const existingStravaId = 15035244053; // This should exist
  const { data: existingRuns2, error: checkError2 } = await supabase
    .from('runs')
    .select('id')
    .eq('strava_id', existingStravaId);

  console.log('Existing check:', { 
    existingRuns2, 
    checkError2,
    length: existingRuns2?.length,
    existingRun: existingRuns2 && existingRuns2.length > 0 ? existingRuns2[0] : null
  });
}

debugSync().catch(console.error);