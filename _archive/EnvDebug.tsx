import React from 'react';

export const EnvDebug: React.FC = () => {
  const envVars = {
    'VITE_SUPABASE_URL': import.meta.env.VITE_SUPABASE_URL,
    'VITE_SUPABASE_ANON_KEY': import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    'VITE_STRAVA_CLIENT_ID': import.meta.env.VITE_STRAVA_CLIENT_ID,
    'VITE_STRAVA_CLIENT_SECRET': import.meta.env.VITE_STRAVA_CLIENT_SECRET ? '✅ Set' : '❌ Missing',
    'VITE_STRAVA_REDIRECT_URI': import.meta.env.VITE_STRAVA_REDIRECT_URI,
    'VITE_OPENWEATHER_API_KEY': import.meta.env.VITE_OPENWEATHER_API_KEY ? '✅ Set' : '❌ Missing',
  };

  // Only show in development or if there are missing variables
  const hasIssues = Object.values(envVars).some(val => val === '❌ Missing' || val === undefined);
  
  if (import.meta.env.PROD && !hasIssues) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <h4 className="font-semibold text-sm mb-2">Environment Variables</h4>
      <div className="text-xs space-y-1">
        {Object.entries(envVars).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="text-gray-600">{key}:</span>
            <span className={value?.includes('❌') ? 'text-red-600' : 'text-green-600'}>
              {value || '❌ Missing'}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Mode: {import.meta.env.MODE} | Prod: {import.meta.env.PROD ? 'Yes' : 'No'}
      </div>
    </div>
  );
};