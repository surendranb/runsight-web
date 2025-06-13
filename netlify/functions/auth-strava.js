// netlify/functions/auth-strava.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*', // Adjust for production
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Environment variables
  const {
    VITE_STRAVA_CLIENT_ID: STRAVA_CLIENT_ID,
    VITE_STRAVA_CLIENT_SECRET: STRAVA_CLIENT_SECRET,
    VITE_STRAVA_REDIRECT_URI: STRAVA_REDIRECT_URI_ENV,
    VITE_SUPABASE_URL: SUPABASE_URL,
    SUPABASE_SERVICE_KEY, // Directly use SUPABASE_SERVICE_KEY for admin operations
    VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY
  } = process.env;

  const STRAVA_REDIRECT_URI = STRAVA_REDIRECT_URI_ENV || 'https://resonant-pony-ea7953.netlify.app/auth/callback'; // Fallback if not set, adjust as needed

  // Check for missing environment variables
  const missingVars = [];
  if (!STRAVA_CLIENT_ID) missingVars.push('VITE_STRAVA_CLIENT_ID');
  if (!STRAVA_CLIENT_SECRET) missingVars.push('VITE_STRAVA_CLIENT_SECRET');
  if (!STRAVA_REDIRECT_URI) missingVars.push('VITE_STRAVA_REDIRECT_URI');
  if (!SUPABASE_URL) missingVars.push('VITE_SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) missingVars.push('VITE_SUPABASE_ANON_KEY');
  if (!SUPABASE_SERVICE_KEY) missingVars.push('SUPABASE_SERVICE_KEY');

  if (missingVars.length > 0) {
    console.error('[auth-strava] Missing environment variables:', missingVars.join(', '));
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error', message: `Missing environment variables: ${missingVars.join(', ')}` }),
    };
  }

  // Public Supabase client for RPC call initially
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  // Admin Supabase client for auth operations
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    if (event.httpMethod === 'GET') {
      // Step 1: Generate Strava authorization URL
      const authUrl = `https://www.strava.com/oauth/authorize?` +
        `client_id=${STRAVA_CLIENT_ID}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(STRAVA_REDIRECT_URI)}&` +
        `approval_prompt=force&` + // 'force' to always show auth screen, 'auto' to skip if already authorized
        `scope=read,activity:read_all`; // Request necessary scopes

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ authUrl }),
      };
    }

    if (event.httpMethod === 'POST') {
      // Step 2: Handle OAuth callback and exchange code for tokens
      const { code } = JSON.parse(event.body);
      if (!code) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Authorization code is required' }) };
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorBody = await tokenResponse.json().catch(() => ({ message: 'Failed to exchange code for token, and error response was not JSON.' }));
        console.error('[auth-strava] Strava token exchange failed:', errorBody);
        return { statusCode: tokenResponse.status, headers, body: JSON.stringify({ error: 'Failed to exchange code for token', details: errorBody.message || errorBody }) };
      }

      const tokenData = await tokenResponse.json();
      const stravaAthleteId = tokenData.athlete.id;

      // Call Supabase RPC to get or generate user UUID
      const { data: generatedUuid, error: rpcError } = await supabase.rpc('generate_strava_user_uuid', { strava_id: stravaAthleteId });

      if (rpcError) {
        console.error('[auth-strava] Supabase RPC error (generate_strava_user_uuid):', rpcError);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to get user UUID from Supabase RPC', details: rpcError.message }) };
      }
      if (!generatedUuid) {
        console.error('[auth-strava] Supabase RPC error: generatedUuid is null or undefined');
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to get user UUID from Supabase RPC: No data returned.' }) };
      }

      // Prepare user metadata
      const userMetadata = {
        strava_access_token: tokenData.access_token,
        strava_refresh_token: tokenData.refresh_token,
        strava_expires_at: tokenData.expires_at,
        strava_id: stravaAthleteId,
        name: `${tokenData.athlete.firstname || ''} ${tokenData.athlete.lastname || ''}`.trim(),
        // Add other athlete details if needed, e.g., profile picture
        // strava_profile_picture: tokenData.athlete.profile,
      };

      const userEmailForAuth = `user_${generatedUuid}@runsight.app`; // Using a deterministic email

      // Check if user exists, then create or update
      let { data: existingAuthUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(generatedUuid);
      let authUserResponse; // To store the user object from create or update operation

      if (getUserError && getUserError.message && getUserError.message.toLowerCase().includes('user not found')) {
        // User does not exist, create new user
        console.log(`[auth-strava] User with UUID ${generatedUuid} not found. Creating new user.`);
        const { data: newAuthUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          id: generatedUuid,
          email: userEmailForAuth,
          email_confirm: true, // Auto-confirm email as it's system-generated
          user_metadata: userMetadata,
        });

        if (createUserError) {
          console.error('[auth-strava] Supabase createUser error:', createUserError);
          return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create Supabase auth user', details: createUserError.message }) };
        }
        authUserResponse = newAuthUserData.user;
        console.log('[auth-strava] New user created successfully:', authUserResponse.id);
      } else if (getUserError) {
        // Another error occurred trying to get the user
        console.error('[auth-strava] Supabase getUserById error:', getUserError);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to get Supabase auth user', details: getUserError.message }) };
      } else {
        // User exists, update metadata
        console.log(`[auth-strava] User with UUID ${generatedUuid} found. Updating metadata.`);
        const { data: updatedAuthUserData, error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
          generatedUuid,
          { user_metadata: userMetadata } // Only update metadata
        );
        if (updateUserError) {
          console.error('[auth-strava] Supabase updateUserById error:', updateUserError);
          return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to update Supabase auth user', details: updateUserError.message }) };
        }
        authUserResponse = updatedAuthUserData.user;
        console.log('[auth-strava] Existing user metadata updated successfully:', authUserResponse.id);
      }

      if (!authUserResponse) {
        console.error('[auth-strava] Auth user record is unexpectedly null after create/update.');
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to obtain a valid auth user record.' }) };
      }

      // Respond with user info (no session token from server-side for this auth type)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          user: { // This is the user object the client expects
            id: authUserResponse.id, // This is the Supabase UUID
            strava_id: stravaAthleteId,
            name: authUserResponse.user_metadata.name,
            email: authUserResponse.email
          },
          // sessionUrl is not applicable here as we are not creating a session directly,
          // the client will handle session creation with Supabase-js using the auth user.
          // The client might need to trigger a signInWithPasswordless or similar if using Supabase client auth.
          // For this server-side token exchange, we are primarily provisioning the user.
          // The frontend `useSecureAuth` hook seems to handle what it needs post-callback.
        }),
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (error) {
    console.error('[auth-strava] Critical error in handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Authentication failed due to an unexpected server error', message: error.message }),
    };
  }
};
