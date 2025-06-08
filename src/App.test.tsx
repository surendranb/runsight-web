import React from 'react';

function TestApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>RunSight Web - Test Mode</h1>
      <p>Environment Variables Status:</p>
      <ul>
        <li>VITE_STRAVA_CLIENT_ID: {import.meta.env.VITE_STRAVA_CLIENT_ID ? '✅ Set' : '❌ Missing'}</li>
        <li>VITE_STRAVA_CLIENT_SECRET: {import.meta.env.VITE_STRAVA_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}</li>
        <li>VITE_STRAVA_REDIRECT_URI: {import.meta.env.VITE_STRAVA_REDIRECT_URI ? '✅ Set' : '❌ Missing'}</li>
        <li>VITE_SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</li>
        <li>VITE_SUPABASE_ANON_KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</li>
        <li>VITE_OPENWEATHER_API_KEY: {import.meta.env.VITE_OPENWEATHER_API_KEY ? '✅ Set' : '❌ Missing'}</li>
      </ul>
      
      <h2>Next Steps:</h2>
      <ol>
        <li>Set up your environment variables in the .env file</li>
        <li>Configure your Strava API application</li>
        <li>Set up your Supabase project</li>
        <li>Get your OpenWeatherMap API key</li>
      </ol>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <strong>Current URL:</strong> {window.location.href}
      </div>
    </div>
  );
}

export default TestApp;