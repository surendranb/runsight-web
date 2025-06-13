// netlify/functions/process-strava-chunk.js

exports.handler = async (event, context) => {
  console.log('[process-strava-chunk-simplified] Function invoked.');
  console.log('[process-strava-chunk-simplified] Event body:', event.body);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const { userId, paginationParams } = JSON.parse(event.body || '{}'); // Ensure body is not null
    console.log('[process-strava-chunk-simplified] Parsed body - userId:', userId, 'paginationParams:', paginationParams);

    // Simulate a successful response structure
    const responseBody = {
      processedRunCount: 0,
      rawActivityCountOnPage: 0,
      savedCount: 0,
      skippedCount: 0,
      individualSaveFailuresCount: 0,
      nextPageParams: null,
      isComplete: true,
      message: "Simplified function executed successfully."
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseBody),
    };

  } catch (error) {
    console.error('[process-strava-chunk-simplified] ERROR:', error.message, error.stack);
    return {
      statusCode: 500, // Or 400 if parsing error
      headers,
      body: JSON.stringify({
        error: 'Error in simplified function',
        message: error.message,
      }),
    };
  }
};
