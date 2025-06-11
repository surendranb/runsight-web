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
    // Define Strava credential variables
    let stravaClientId;
    let stravaClientSecret;

    // Use existing VITE_ environment variables (they're available server-side too)
    const STRAVA_REDIRECT_URI = process.env.VITE_STRAVA_REDIRECT_URI || 'https://resonant-pony-ea7953.netlify.app/auth/callback';
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    // Ensure SUPABASE_SERVICE_KEY is configured (use VITE_ prefix for Netlify, or direct for local)
    const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

    console.log('[auth-strava] SUPABASE_URL configured:', !!SUPABASE_URL, '; SUPABASE_ANON_KEY configured:', !!SUPABASE_ANON_KEY, '; SUPABASE_SERVICE_KEY configured:', !!SUPABASE_SERVICE_KEY);

    // Basic check for Supabase connectivity details first
    const criticalMissingVars = [];
    if (!SUPABASE_URL) criticalMissingVars.push('VITE_SUPABASE_URL');
    if (!SUPABASE_SERVICE_KEY) criticalMissingVars.push('SUPABASE_SERVICE_KEY'); // Needed for Vault
    if (!SUPABASE_ANON_KEY) criticalMissingVars.push('VITE_SUPABASE_ANON_KEY'); // Needed for public client
    if (!STRAVA_REDIRECT_URI) criticalMissingVars.push('VITE_STRAVA_REDIRECT_URI');


    if (criticalMissingVars.length > 0) {
      throw new Error(`Missing critical environment variables: ${criticalMissingVars.join(', ')}. Please set these in Netlify dashboard and redeploy.`);
    }

    // Initialize Supabase Admin client for Vault and auth operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Fetch Strava credentials from Vault
    try {
        console.log('[auth-strava] Attempting to fetch Strava credentials from Vault...');
        const { data: clientIdFromVault, error: clientIdError } = await supabaseAdmin.rpc('get_strava_client_id');
        if (clientIdError) {
            console.warn('[auth-strava] Error fetching Strava Client ID from Vault RPC:', clientIdError.message);
            // Do not throw, allow fallback
        }
        if (clientIdFromVault) {
            stravaClientId = clientIdFromVault;
            console.log('[auth-strava] Successfully fetched Strava Client ID from Vault.');
        } else {
            console.log('[auth-strava] Strava Client ID not found in Vault or RPC returned null.');
        }

        const { data: clientSecretFromVault, error: clientSecretError } = await supabaseAdmin.rpc('get_strava_client_secret');
        if (clientSecretError) {
            console.warn('[auth-strava] Error fetching Strava Client Secret from Vault RPC:', clientSecretError.message);
            // Do not throw, allow fallback
        }
        if (clientSecretFromVault) {
            stravaClientSecret = clientSecretFromVault;
            console.log('[auth-strava] Successfully fetched Strava Client Secret from Vault.');
        } else {
            console.log('[auth-strava] Strava Client Secret not found in Vault or RPC returned null.');
        }
    } catch (rpcError) {
        console.warn('[auth-strava] Generic error during Strava credentials fetch from Vault:', rpcError.message, 'Falling back to environment variables.');
        // Ensure variables are reset if only one part failed, to trigger fallback for both
        stravaClientId = null;
        stravaClientSecret = null;
    }

    // Fallback to Environment Variables
    if (!stravaClientId) {
        stravaClientId = process.env.VITE_STRAVA_CLIENT_ID;
        if (stravaClientId) {
            console.log('[auth-strava] Using Strava Client ID from environment variable (VITE_STRAVA_CLIENT_ID).');
        }
    }
    if (!stravaClientSecret) {
        stravaClientSecret = process.env.VITE_STRAVA_CLIENT_SECRET;
        if (stravaClientSecret) {
            console.log('[auth-strava] Using Strava Client Secret from environment variable (VITE_STRAVA_CLIENT_SECRET).');
        }
    }

    // Check for missing Strava credentials after attempting Vault and Env fallback
    const missingVars = [];
    if (!stravaClientId) missingVars.push('Strava Client ID (from Vault or VITE_STRAVA_CLIENT_ID)');
    if (!stravaClientSecret) missingVars.push('Strava Client Secret (from Vault or VITE_STRAVA_CLIENT_SECRET)');
    // Note: criticalMissingVars already checked SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY, STRAVA_REDIRECT_URI

    if (missingVars.length > 0) {
      // Log which specific variables are missing (Vault or Env)
      const detailedMessage = `Missing required configuration: ${missingVars.join(', ')}. Please set these in Netlify dashboard, ensure Vault is configured, or provide them during app setup.`;
      console.error(`[auth-strava] ${detailedMessage}`);
      throw new Error(detailedMessage);
    }

    // Public client for RPC call (generate_strava_user_uuid)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    if (event.httpMethod === 'GET') {
      // Step 1: Generate Strava authorization URL
      const authUrl = `https://www.strava.com/oauth/authorize?` +
        `client_id=${stravaClientId}&` +
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
          client_id: stravaClientId,
          client_secret: stravaClientSecret,
          code: code,
          grant_type: 'authorization_code'
        })
      });

      if (!tokenResponse.ok) {
        // Log more details from Strava's error if possible
        let errorBody = 'Unknown error from Strava';
        try {
            errorBody = await tokenResponse.text(); // Use text() to avoid JSON parse error if not JSON
        } catch (e) { /* ignore */ }
        console.error(`[auth-strava] Strava token exchange failed. Status: ${tokenResponse.status}. Body: ${errorBody}`);
        throw new Error(`Failed to exchange code for token with Strava. Status: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();
      console.log('[auth-strava] Strava token exchange successful. Athlete ID:', tokenData.athlete.id);

      // Get the Strava athlete ID
      const strava_athlete_id = tokenData.athlete.id;

      // Call Supabase RPC to get or generate user UUID (using the public client 'supabase')
      const { data: generatedUuid, error: rpcError } = await supabase.rpc('generate_strava_user_uuid', { strava_id: strava_athlete_id });
      console.log('[auth-strava] generate_strava_user_uuid RPC result. UUID:', generatedUuid, 'Error:', JSON.stringify(rpcError, null, 2));


      if (rpcError) {
        console.error('[auth-strava] Supabase RPC error (generate_strava_user_uuid):', rpcError);
        throw new Error(`Failed to get user UUID from Supabase RPC: ${rpcError.message}`);
      }

      if (!generatedUuid) {
        console.error('[auth-strava] Supabase RPC error: generatedUuid is null or undefined');
        throw new Error('Failed to get user UUID from Supabase RPC: No data returned.');
      }

      // supabaseAdmin client is already initialized above

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
      console.error('[auth-strava] Critical error in handler:', error.message, 'Stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Authentication failed',
        message: error.message // Provide the actual error message to the client
      })
    };
  }
};