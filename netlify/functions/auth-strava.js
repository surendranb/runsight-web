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
    // Ensure SUPABASE_SERVICE_KEY is configured (use VITE_ prefix for Netlify, or direct for local)
    const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

    console.log('[auth-strava] SUPABASE_URL configured:', !!SUPABASE_URL, '; SUPABASE_ANON_KEY configured:', !!SUPABASE_ANON_KEY, '; SUPABASE_SERVICE_KEY configured:', !!SUPABASE_SERVICE_KEY);

    // Check for missing environment variables with detailed error
    const missingVars = [];
    if (!STRAVA_CLIENT_ID) missingVars.push('VITE_STRAVA_CLIENT_ID');
    if (!STRAVA_CLIENT_SECRET) missingVars.push('VITE_STRAVA_CLIENT_SECRET');
    if (!STRAVA_REDIRECT_URI) missingVars.push('VITE_STRAVA_REDIRECT_URI');
    if (!SUPABASE_URL) missingVars.push('VITE_SUPABASE_URL');
    if (!SUPABASE_ANON_KEY) missingVars.push('VITE_SUPABASE_ANON_KEY'); // Still check anon key for the public client
    if (!SUPABASE_SERVICE_KEY) missingVars.push('SUPABASE_SERVICE_KEY');


    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}. Please set these in Netlify dashboard and redeploy.`);
    }

    // Public client for RPC call (if RPC permissions allow anon or user role)
    // Note: The existing supabase client uses VITE_SUPABASE_ANON_KEY.
    // For admin operations, a new client with SERVICE_KEY is needed.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


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
      console.log('[auth-strava] POST request received.');
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
      console.log('[auth-strava] Strava token exchange successful. Athlete ID:', tokenData.athlete.id);

      // Get the Strava athlete ID
      const strava_athlete_id = tokenData.athlete.id;

      // Call Supabase RPC to get or generate user UUID (using the public client)
      const { data: generatedUuid, error: rpcError } = await supabase.rpc('generate_strava_user_uuid', { strava_id: strava_athlete_id });
      console.log('[auth-strava] generate_strava_user_uuid RPC result. UUID:', generatedUuid, 'Error:', JSON.stringify(rpcError, null, 2));


      if (rpcError) {
        console.error('Supabase RPC error (generate_strava_user_uuid):', rpcError); // Keep specific error for this
        throw new Error(`Failed to get user UUID from Supabase RPC: ${rpcError.message}`);
      }

      if (!generatedUuid) {
        console.error('Supabase RPC error: generatedUuid is null or undefined'); // Keep specific error for this
        throw new Error('Failed to get user UUID from Supabase RPC: No data returned.');
      }

      // Initialize Supabase Admin client for auth operations
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      const userMetadata = {
        strava_access_token: tokenData.access_token,
        strava_refresh_token: tokenData.refresh_token,
        strava_expires_at: tokenData.expires_at,
        strava_id: strava_athlete_id, // Store Strava ID in metadata
        name: `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`
      };

      let authUser;
      console.log('[auth-strava] Attempting to get user by UUID:', generatedUuid);
      let { data: existingAuthUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(generatedUuid);

      if (getUserError) {
        console.log('[auth-strava] getUserById error:', JSON.stringify(getUserError, null, 2));
        console.log('[auth-strava] User not found with getUserById (or other error). Attempting to determine if "not found"...');
        const isNotFoundError = getUserError.message && getUserError.message.toLowerCase().includes('user not found');
        console.log('[auth-strava] Condition for creation (is "user not found" error):', isNotFoundError);

        if (isNotFoundError) {
          const userEmailForAuth = `user_${generatedUuid}@runsight.app`;
          console.log('[auth-strava] Attempting to create user with UUID:', generatedUuid, 'Email:', userEmailForAuth, 'Metadata:', JSON.stringify(userMetadata, null, 2));
          const { data: newAuthUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
            id: generatedUuid,
            email: userEmailForAuth,
            email_confirm: true,
            user_metadata: userMetadata
          });

          if (createUserError) {
            console.log('[auth-strava] createUser error:', JSON.stringify(createUserError, null, 2));
            console.error('Supabase createUser error:', createUserError); // Keep specific error
            throw new Error(`Failed to create Supabase auth user: ${createUserError.message}`);
          }
          console.log('[auth-strava] createUser success. New authUser data:', JSON.stringify(newAuthUserData, null, 2));
          authUser = newAuthUserData.user;
        } else {
          // Another error occurred trying to get the user
          console.error('Supabase getUserById error:', getUserError); // Keep specific error
          throw new Error(`Failed to get Supabase auth user: ${getUserError.message}`);
        }
      } else {
        console.log('[auth-strava] getUserById success. Existing user data:', JSON.stringify(existingAuthUser, null, 2));
        authUser = existingAuthUser.user;
        console.log('[auth-strava] User found. Attempting to update metadata for UUID:', generatedUuid, 'Metadata:', JSON.stringify(userMetadata, null, 2));
        const { data: updatedAuthUserData, error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
          generatedUuid,
          { user_metadata: userMetadata }
        );

        if (updateUserError) {
          console.log('[auth-strava] updateUserById error:', JSON.stringify(updateUserError, null, 2));
          console.error('Supabase updateUserById error:', updateUserError); // Keep specific error
          throw new Error(`Failed to update Supabase auth user: ${updateUserError.message}`);
        }
        console.log('[auth-strava] updateUserById success. Updated authUser data:', JSON.stringify(updatedAuthUserData, null, 2));
        authUser = updatedAuthUserData.user;
      }

      if (!authUser) {
        console.error('Auth user record is unexpectedly null after create/update.'); // Keep specific error
        throw new Error('Failed to obtain a valid auth user record.');
      }

      console.log('[auth-strava] Preparing final response. AuthUser for response:', JSON.stringify(authUser, null, 2));
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          user: {
            id: generatedUuid,
            strava_id: strava_athlete_id,
            name: authUser.user_metadata.name || `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`,
            email: authUser.email
          },
          sessionUrl: null
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('[auth-strava] Critical error in handler:', error, 'Stack:', error.stack);
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