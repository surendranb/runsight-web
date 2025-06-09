// Netlify Function: Fetch Strava activities (server-side)
// This keeps Strava API calls and tokens on the server

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get user ID from request
    const { userId, days = 7 } = JSON.parse(event.body);

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get user's Strava tokens from Supabase (server-side)
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user) {
      throw new Error('User not found');
    }

    const stravaAccessToken = user.user.user_metadata?.strava_access_token;
    const stravaRefreshToken = user.user.user_metadata?.strava_refresh_token;
    const stravaExpiresAt = user.user.user_metadata?.strava_expires_at;

    if (!stravaAccessToken) {
      throw new Error('Strava access token not found');
    }

    // Check if token needs refresh
    let accessToken = stravaAccessToken;
    if (stravaExpiresAt && Date.now() / 1000 > stravaExpiresAt) {
      // Refresh token (server-side)
      const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          refresh_token: stravaRefreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh Strava token');
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update user metadata with new tokens
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...user.user.user_metadata,
          strava_access_token: refreshData.access_token,
          strava_refresh_token: refreshData.refresh_token,
          strava_expires_at: refreshData.expires_at
        }
      });
    }

    // Calculate date range
    const after = Math.floor((Date.now() - (days * 24 * 60 * 60 * 1000)) / 1000);

    // Fetch activities from Strava (server-side)
    const activitiesResponse = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=50`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!activitiesResponse.ok) {
      throw new Error('Failed to fetch activities from Strava');
    }

    const activities = await activitiesResponse.json();

    // Filter for running activities
    const runs = activities.filter(activity => 
      activity.type === 'Run' && 
      activity.start_latlng && 
      activity.start_latlng.length === 2
    );

    console.log(`✅ Fetched ${runs.length} runs for user ${userId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        runs: runs,
        count: runs.length
      })
    };

  } catch (error) {
    console.error('Fetch activities error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch activities',
        message: error.message 
      })
    };
  }
};