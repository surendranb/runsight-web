// Simple test function to isolate the issue
// This tests basic function execution without dependencies

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Test 1: Basic function execution
    const basicTest = {
      message: "Function is executing",
      timestamp: new Date().toISOString(),
      method: event.httpMethod,
      path: event.path
    };

    // Test 2: Environment variable access (without dependencies)
    const envTest = {
      NODE_ENV: process.env.NODE_ENV || 'undefined',
      NETLIFY: process.env.NETLIFY || 'undefined',
      STRAVA_CLIENT_ID: process.env.STRAVA_CLIENT_ID ? 'PRESENT' : 'MISSING',
      STRAVA_CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET ? 'PRESENT' : 'MISSING',
      // Show first few chars if present
      STRAVA_CLIENT_ID_PREVIEW: process.env.STRAVA_CLIENT_ID ? 
        process.env.STRAVA_CLIENT_ID.substring(0, 4) + '...' : 'MISSING'
    };

    // Test 3: Try to require Supabase (this might be the issue)
    let supabaseTest;
    try {
      const { createClient } = require('@supabase/supabase-js');
      supabaseTest = {
        status: "SUCCESS",
        message: "Supabase package loaded successfully"
      };
    } catch (error) {
      supabaseTest = {
        status: "ERROR",
        message: error.message,
        error: "Cannot load @supabase/supabase-js package"
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tests: {
          basic_execution: basicTest,
          environment_variables: envTest,
          supabase_dependency: supabaseTest
        }
      }, null, 2)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Simple test failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
};