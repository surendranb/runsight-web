// netlify/functions/check-strava-keys-status.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*', // Adjust for production
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS', // Should be GET
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[check-strava-keys-status] Server configuration error.');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error.' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Authentication check (ensure a logged-in user is making this request)
  const clientContext = context.clientContext;
  if (!clientContext || !clientContext.user) {
    console.warn('[check-strava-keys-status] No authenticated user context.');
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Authentication required.' }),
    };
  }
  console.log('[check-strava-keys-status] Called by authenticated user:', clientContext.user.sub);

  try {
    // Attempt to fetch one of the keys from Vault. If it exists, assume configured.
    const { data: clientIdFromVault, error: rpcError } = await supabase.rpc('get_strava_client_id');

    if (rpcError) {
      // Log the error but don't necessarily treat as "not configured" unless it's a specific "not found" type.
      // However, any error accessing it likely means setup isn't complete or Vault is inaccessible.
      console.error('[check-strava-keys-status] RPC error fetching Strava Client ID from Vault:', rpcError.message);
      // Depending on the error, you might want to return configured: false or a specific error state.
      // For simplicity, if we can't confirm it's there, we'll say it's not configured.
      return { statusCode: 200, headers, body: JSON.stringify({ configured: false, error: 'Failed to check configuration.' }) };
    }

    if (clientIdFromVault) {
      console.log('[check-strava-keys-status] Strava Client ID found in Vault. Keys are configured.');
      return { statusCode: 200, headers, body: JSON.stringify({ configured: true }) };
    } else {
      console.log('[check-strava-keys-status] Strava Client ID not found in Vault. Keys are not configured.');
      return { statusCode: 200, headers, body: JSON.stringify({ configured: false }) };
    }
  } catch (error) {
    console.error('[check-strava-keys-status] Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to check Strava keys status.', message: error.message, configured: false }),
    };
  }
};
