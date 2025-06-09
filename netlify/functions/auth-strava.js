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
    // Server-side environment variables (secure)
    const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
    const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
    const STRAVA_REDIRECT_URI = process.env.STRAVA_REDIRECT_URI;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Service key, not anon key!

    if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing required environment variables');
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

      // Create or update user in Supabase (server-side)
      const { data: user, error: userError } = await supabase.auth.admin.createUser({
        email: `strava_${tokenData.athlete.id}@runsight.app`,
        user_metadata: {
          strava_id: tokenData.athlete.id,
          strava_access_token: tokenData.access_token,
          strava_refresh_token: tokenData.refresh_token,
          strava_expires_at: tokenData.expires_at,
          athlete_data: tokenData.athlete
        }
      });

      if (userError && !userError.message.includes('already registered')) {
        throw new Error(`Failed to create user: ${userError.message}`);
      }

      // Generate session token for frontend
      const { data: session, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: `strava_${tokenData.athlete.id}@runsight.app`
      });

      if (sessionError) {
        throw new Error(`Failed to generate session: ${sessionError.message}`);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          user: {
            id: user?.user?.id || session.user.id,
            strava_id: tokenData.athlete.id,
            name: tokenData.athlete.firstname + ' ' + tokenData.athlete.lastname
          },
          session_url: session.properties.action_link
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