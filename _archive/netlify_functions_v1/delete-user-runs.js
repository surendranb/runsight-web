// netlify/functions/delete-user-runs.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*', // Adjust for production
    'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Ensure Authorization is allowed if you check user sessions
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
      body: JSON.stringify({ error: 'Method not allowed. Please use POST.' })
    };
  }

  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('[delete-user-runs] Missing Supabase configuration.');
      throw new Error('Server configuration error: Supabase details not found.');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // It's crucial to authenticate/authorize this request.
    // For now, we'll assume a userId is passed in the body.
    // In a real app, you'd verify the user's JWT from the Authorization header
    // to ensure they can only delete their own data.
    // const { user } = context.clientContext; // Example: if Netlify Identity is used and token passed
    // if (!user || user.sub !== expectedUserId) {
    //   return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    // }

    const { userId } = JSON.parse(event.body);

    if (!userId) {
      console.warn('[delete-user-runs] User ID is missing from request body.');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID is required in the request body.' })
      };
    }

    console.log(`[delete-user-runs] Attempting to delete runs for userId: ${userId}`);

    // Delete runs for the specified user
    const { error: deleteError, count } = await supabase
      .from('runs')
      .delete({ count: 'exact' }) // Get the count of deleted rows
      .eq('user_id', userId);

    if (deleteError) {
      console.error(`[delete-user-runs] Error deleting runs for userId ${userId}:`, deleteError);
      throw new Error(`Failed to delete runs: ${deleteError.message}`);
    }

    console.log(`[delete-user-runs] Successfully deleted ${count} runs for userId: ${userId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully deleted ${count} runs for user ${userId}.`,
        deleted_count: count
      })
    };

  } catch (error) {
    console.error('[delete-user-runs] Critical error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to delete user runs',
        message: error.message
      })
    };
  }
};
