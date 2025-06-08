import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { exchangeCodeForToken, saveUserToDatabase, fetchStravaActivities, saveActivityToDatabase } from '../lib/strava';
import { fetchWeatherData, saveWeatherToDatabase } from '../lib/weather';
import { User } from '../types';

interface StravaCallbackProps {
  onLoginSuccess: (user: User) => void;
}

export const StravaCallback: React.FC<StravaCallbackProps> = ({ onLoginSuccess }) => {
  const [status, setStatus] = useState('Connecting to Strava...');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        console.log('URL params:', { code: code?.substring(0, 10) + '...', error });

        if (error) {
          throw new Error(`Strava authorization error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received from Strava');
        }

        setStatus('Exchanging authorization code...');
        setProgress(20);

        // Exchange code for token
        const authResponse = await exchangeCodeForToken(code);
        console.log('Auth response received:', { athlete: authResponse.athlete?.firstname });
        
        setStatus('Saving user data...');
        setProgress(40);

        // Save user to database
        const user = await saveUserToDatabase(authResponse);
        console.log('User saved, fetching activities...');
        
        setStatus('Importing your running activities...');
        setProgress(60);

        // Fetch all running activities from Strava
        let allActivities: any[] = [];
        let page = 1;
        const perPage = 50;
        
        while (true) {
          const activities = await fetchStravaActivities(authResponse.access_token, page, perPage);
          if (activities.length === 0) break;
          
          // Filter only running activities
          const runningActivities = activities.filter(activity => activity.type === 'Run');
          allActivities = [...allActivities, ...runningActivities];
          
          page++;
          if (activities.length < perPage) break; // Last page
        }

        console.log(`Found ${allActivities.length} running activities`);
        
        setStatus(`Saving ${allActivities.length} running activities...`);
        setProgress(80);

        // Save activities to database
        for (const activity of allActivities) {
          try {
            const savedActivity = await saveActivityToDatabase(activity, user.id);
            
            // Fetch weather data if we have coordinates
            if (activity.start_latlng && activity.start_latlng.length === 2) {
              try {
                const [lat, lon] = activity.start_latlng;
                const weatherData = await fetchWeatherData(lat, lon, activity.start_date);
                await saveWeatherToDatabase(weatherData.data, savedActivity.id);
              } catch (weatherError) {
                console.warn('Failed to fetch weather for activity:', activity.id, weatherError);
                // Continue without weather data
              }
            }
          } catch (activityError) {
            console.warn('Failed to save activity:', activity.id, activityError);
            // Continue with other activities
          }
        }
        
        setStatus('Complete! Redirecting to your dashboard...');
        setProgress(100);

        setTimeout(() => {
          onLoginSuccess(user);
        }, 1500);
        
      } catch (error) {
        console.error('Callback error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setError(errorMessage);
        setStatus(`Error: ${errorMessage}`);
      }
    };

    handleCallback();
  }, [onLoginSuccess]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="bg-red-100 p-4 rounded-full w-16 h-16 mx-auto mb-6">
              <Activity className="w-8 h-8 text-red-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Failed</h2>
            <p className="text-red-600 mb-6">{error}</p>
            
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-full w-16 h-16 mx-auto mb-6">
            <Activity className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Setting Up Your Account</h2>
          
          <div className="mb-6">
            <div className="bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-gray-600">{status}</p>
          </div>
          
          {progress < 100 && (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};