// Debug function to check environment variables (temporary)
// This helps diagnose the 500 error in auth-strava

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Check which environment variables are available
    const envCheck = {
      STRAVA_CLIENT_ID: !!process.env.STRAVA_CLIENT_ID,
      STRAVA_CLIENT_SECRET: !!process.env.STRAVA_CLIENT_SECRET,
      STRAVA_REDIRECT_URI: !!process.env.STRAVA_REDIRECT_URI,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      OPENWEATHER_API_KEY: !!process.env.OPENWEATHER_API_KEY,
    };

    // Show partial values (first 4 chars) for debugging without exposing secrets
    const envValues = {
      STRAVA_CLIENT_ID: process.env.STRAVA_CLIENT_ID ? 
        process.env.STRAVA_CLIENT_ID.substring(0, 4) + '...' : 'MISSING',
      STRAVA_CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET ? 
        process.env.STRAVA_CLIENT_SECRET.substring(0, 4) + '...' : 'MISSING',
      STRAVA_REDIRECT_URI: process.env.STRAVA_REDIRECT_URI || 'MISSING',
      SUPABASE_URL: process.env.SUPABASE_URL ? 
        process.env.SUPABASE_URL.substring(0, 20) + '...' : 'MISSING',
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 
        process.env.SUPABASE_SERVICE_KEY.substring(0, 4) + '...' : 'MISSING',
      OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY ? 
        process.env.OPENWEATHER_API_KEY.substring(0, 4) + '...' : 'MISSING',
    };

    const allPresent = Object.values(envCheck).every(Boolean);
    const missingVars = Object.entries(envCheck)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        environment_check: envCheck,
        environment_values: envValues,
        all_variables_present: allPresent,
        missing_variables: missingVars,
        message: allPresent ? 
          '✅ All environment variables are present!' : 
          `❌ Missing variables: ${missingVars.join(', ')}`,
        instructions: allPresent ? 
          'Environment looks good! The auth-strava function should work now.' :
          'Please set the missing environment variables in Netlify dashboard and redeploy.'
      }, null, 2)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Debug function failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
};