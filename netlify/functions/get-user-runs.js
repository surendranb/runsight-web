// Get User Runs - Simple function to fetch user's running data

// Import the ES modules using dynamic import since Netlify functions use CommonJS
let dataStorer, transformToLegacyFormat;

async function getModules() {
  if (!dataStorer) {
    const storerModule = await import('../../src/lib/data-storer.ts');
    const transformerModule = await import('../../src/lib/transformers.ts');
    dataStorer = storerModule.dataStorer;
    transformToLegacyFormat = transformerModule.transformToLegacyFormat;
  }
  return { dataStorer, transformToLegacyFormat };
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Please use GET.' }),
    };
  }

  const userId = event.queryStringParameters?.userId;

  if (!userId) {
    return { 
      statusCode: 400, 
      headers, 
      body: JSON.stringify({ error: 'User ID is required as a query string parameter.' }) 
    };
  }

  console.log(`[get-user-runs] Fetching runs for userId: ${userId}`);

  try {
    // Get the modules
    const { dataStorer, transformToLegacyFormat } = await getModules();
    
    // Get activities from the new data store
    const { activities, total } = await dataStorer.getActivities(userId, {
      limit: 1000, // Get up to 1000 recent activities
      offset: 0
    });

    console.log(`[get-user-runs] Successfully fetched ${activities.length} runs for user ${userId}`);

    // Transform to legacy format for backward compatibility
    const legacyRuns = activities.map(activity => transformToLegacyFormat(activity));

    // Calculate statistics
    const stats = {
      total_runs: activities.length,
      total_distance: 0, // in meters
      total_moving_time: 0, // in seconds
      average_pace_seconds_per_km: 0,
      average_distance_per_run_meters: 0,
    };

    if (activities.length > 0) {
      stats.total_distance = activities.reduce((sum, run) => sum + (run.distance_meters || 0), 0);
      stats.total_moving_time = activities.reduce((sum, run) => sum + (run.moving_time_seconds || 0), 0);

      stats.average_distance_per_run_meters = stats.total_distance / activities.length;

      // Calculate average pace (seconds per kilometer)
      const runsWithValidPaceData = activities.filter(r => 
        r.distance_meters && r.distance_meters > 0 && 
        r.moving_time_seconds && r.moving_time_seconds > 0
      );
      
      if (runsWithValidPaceData.length > 0) {
        const totalPaceSecondsSum = runsWithValidPaceData.reduce((sum, run) => {
          return sum + (run.moving_time_seconds / (run.distance_meters / 1000)); // pace in seconds/km for this run
        }, 0);
        stats.average_pace_seconds_per_km = totalPaceSecondsSum / runsWithValidPaceData.length;
      }
    }

    console.log(`[get-user-runs] Calculated stats for user ${userId}:`, stats);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        runs: legacyRuns,
        stats: stats,
        count: activities.length,
        total: total
      }),
    };

  } catch (error) {
    console.error('[get-user-runs] Critical error for userId', userId, ':', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch user runs', 
        message: error.message 
      }),
    };
  }
};