// netlify/functions/save-strava-credentials.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*', // Adjust for your frontend's origin in production
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Ensure this function is called by an authenticated user.
  // The client making this request should include a Supabase JWT.
  // We'll use the service_role key here to perform admin actions (saving secrets).
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Or VITE_SUPABASE_SERVICE_KEY if prefixed

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase URL or Service Key is not configured.');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error.' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // --- Begin Authentication Check ---
  // This is a critical step. We need to verify the user making the request.
  // Netlify functions can access the clientContext if a JWT is passed in the Authorization header.
  const clientContext = context.clientContext;
  if (!clientContext || !clientContext.user) {
    // If you are using Supabase client-side auth, the user object might be in clientContext.user
    // This happens if the request from frontend includes 'Authorization: Bearer <SUPABASE_JWT>'
    console.warn('[save-strava-credentials] No authenticated user context found. Ensure client sends Supabase JWT.');
    // If you are passing the user ID manually from an authenticated client,
    // you might want to verify it or ensure this endpoint is properly protected.
    // For now, we'll deny if no user context from Netlify's identity/JWT processing.
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Authentication required. User not verified.' }),
    };
  }
  // At this point, clientContext.user should contain user information if a valid JWT was provided.
  // You might not need the user's ID to save these global secrets, but it's good practice to ensure
  // that only an authenticated and authorized user can call this function.
  console.log('[save-strava-credentials] Called by authenticated user:', clientContext.user.sub); // User's Supabase ID
  // --- End Authentication Check ---


  try {
    const { strava_client_id, strava_client_secret } = JSON.parse(event.body);

    if (!strava_client_id || !strava_client_secret) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Strava client ID and secret are required.' }) };
    }

    // Call the SQL function to set/update Strava Client ID
    const { error: clientIdError } = await supabase.rpc('set_strava_client_id', { new_value: strava_client_id });
    if (clientIdError) {
      console.error('Error saving Strava Client ID:', clientIdError);
      throw new Error(`Failed to save Strava Client ID: ${clientIdError.message}`);
    }

    // Call the SQL function to set/update Strava Client Secret
    const { error: clientSecretError } = await supabase.rpc('set_strava_client_secret', { new_value: strava_client_secret });
    if (clientSecretError) {
      console.error('Error saving Strava Client Secret:', clientSecretError);
      // Potentially attempt to rollback or handle partial save if necessary,
      // though for this case, if client_id saved but secret failed, it's an inconsistent state.
      throw new Error(`Failed to save Strava Client Secret: ${clientSecretError.message}`);
    }

    console.log('[save-strava-credentials] Strava credentials saved successfully to Vault.');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Strava credentials saved successfully.' }),
    };

  } catch (error) {
    console.error('[save-strava-credentials] Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to save Strava credentials.', message: error.message }),
    };
  }
};
