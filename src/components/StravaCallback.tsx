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

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

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
        
        setStatus('Saving user data...');
        setProgress(40);

        // Save user to database
        const user = await saveUserToDatabase(authResponse);
        
        setStatus('Fetching your activities...');
        setProgress(60);

        // Fetch and save activities
        const activities = await fetchStravaActivities(authResponse.access_token);
        const runningActivities = activities.filter(activity => activity.type === 'Run');
        
        setStatus(`Processing ${runningActivities.length} running activities...`);
        setProgress(80);

        // Process activities and fetch weather data
        for (let i = 0; i < runningActivities.length; i++) {
          const activity = runningActivities[i];
          
          // Save activity to database
          const savedActivity = await saveActivityToDatabase(activity, user.id);
          
          // Fetch weather data if location is available
          if (activity.start_latlng && activity.start_latlng.length === 2) {
            try {
              const weatherData = await fetchWeatherData(
                activity.start_latlng[0],
                activity.start_latlng[1],
                activity.start_date
              );
              await saveWeatherToDatabase(weatherData.data, savedActivity.id);
            } catch (weatherError) {
              console.warn(`Failed to fetch weather for activity ${activity.id}:`, weatherError);
            }
          }
          
          // Update progress
          const activityProgress = (i + 1) / runningActivities.length * 20;
          setProgress(80 + activityProgress);
        }

        setStatus('Complete! Redirecting...');
        setProgress(100);

        // Redirect to dashboard
        onLoginSuccess(user);
        
      } catch (error) {
        console.error('Callback error:', error);
        setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
      }
    };

    handleCallback();
  }, [onLoginSuccess]);

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