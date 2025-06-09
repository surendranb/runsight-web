// Netlify Function: Handle Strava OAuth (server-side)
// This keeps all Strava credentials on the server

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // CORS headers for frontend requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Use existing VITE_ environment variables (they're available server-side too)
    const STRAVA_CLIENT_ID = process.env.VITE_STRAVA_CLIENT_ID;
    const STRAVA_CLIENT_SECRET = process.env.VITE_STRAVA_CLIENT_SECRET;
    const STRAVA_REDIRECT_URI = process.env.VITE_STRAVA_REDIRECT_URI || 'https://resonant-pony-ea7953.netlify.app/auth/callback';
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_ANON_KEY; // Using anon key for now

    // Check for missing environment variables with detailed error
    const missingVars = [];
    if (!STRAVA_CLIENT_ID) missingVars.push('VITE_STRAVA_CLIENT_ID');
    if (!STRAVA_CLIENT_SECRET) missingVars.push('VITE_STRAVA_CLIENT_SECRET');
    if (!STRAVA_REDIRECT_URI) missingVars.push('VITE_STRAVA_REDIRECT_URI');
    if (!SUPABASE_URL) missingVars.push('VITE_SUPABASE_URL');
    if (!SUPABASE_SERVICE_KEY) missingVars.push('VITE_SUPABASE_ANON_KEY');

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}. Please set these in Netlify dashboard and redeploy.`);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (event.httpMethod === 'GET') {
      // Step 1: Generate Strava authorization URL
      const authUrl = `https://www.strava.com/oauth/authorize?` +
        `client_id=${STRAVA_CLIENT_ID}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(STRAVA_REDIRECT_URI)}&` +
        `approval_prompt=force&` +
        `scope=read,activity:read_all`;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ authUrl })
      };
    }

    if (event.httpMethod === 'POST') {
      // Step 2: Handle OAuth callback and exchange code for tokens
      const { code } = JSON.parse(event.body);

      if (!code) {
        throw new Error('Authorization code is required');
      }

      // Exchange code for access token (server-side)
      const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code'
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const tokenData = await tokenResponse.json();

      // For now, create a simple user object without database storage
      // This allows the OAuth flow to complete while we set up the database properly
      const user = {
        id: `strava_${tokenData.athlete.id}`,
        strava_id: tokenData.athlete.id,
        name: `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`,
        email: `strava_${tokenData.athlete.id}@runsight.app`,
        strava_access_token: tokenData.access_token,
        strava_refresh_token: tokenData.refresh_token,
        strava_expires_at: tokenData.expires_at,
        athlete_data: tokenData.athlete
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          user: {
            id: user.id,
            strava_id: user.strava_id,
            name: user.name,
            email: user.email
          },
          sessionUrl: null // Session handled client-side for now
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Auth error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Authentication failed',
        message: error.message 
      })
    };
  }
};