import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle, AlertCircle } from 'lucide-react';
import { exchangeCodeForToken } from '../lib/strava';
import { authenticateWithStrava } from '../lib/simple-auth';
import { fetchStravaActivities, processAndSaveActivities } from '../lib/simple-data';
import { SimpleUser } from '../lib/simple-auth';

interface SimpleStravaCallbackProps {
  onSuccess: (user: SimpleUser) => void;
}

export const SimpleStravaCallback: React.FC<SimpleStravaCallbackProps> = ({ onSuccess }) => {
  const [status, setStatus] = useState('Connecting to Strava...');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentActivity, setCurrentActivity] = useState('');
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

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

        // Step 1: Exchange code for token
        setStatus('Exchanging authorization code...');
        setProgress(10);
        
        const authResponse = await exchangeCodeForToken(code);
        console.log('✅ Got Strava tokens');

        // Step 2: Authenticate with Supabase
        setStatus('Creating your account...');
        setProgress(20);
        
        const user = await authenticateWithStrava(authResponse);
        console.log('✅ User authenticated:', user.id);

        // Step 3: Fetch activities
        setStatus('Fetching your recent runs...');
        setProgress(30);
        
        const activities = await fetchStravaActivities(user.access_token, 7);
        console.log(`✅ Found ${activities.length} activities`);

        if (activities.length === 0) {
          setStatus('No running activities found in the last 7 days');
          setProgress(100);
          setTimeout(() => onSuccess(user), 2000);
          return;
        }

        // Step 4: Process and save activities
        setStatus('Processing and saving your runs...');
        setProgress(40);
        setTotalCount(activities.length);

        const savedRuns = await processAndSaveActivities(
          user, 
          activities,
          (current, total, activityName) => {
            setProcessedCount(current);
            setCurrentActivity(activityName);
            setProgress(40 + (current / total) * 50);
          }
        );

        // Step 5: Complete
        setStatus(`Successfully imported ${savedRuns.length} runs!`);
        setProgress(100);
        setCurrentActivity('');

        // Redirect to dashboard
        setTimeout(() => {
          window.history.replaceState({}, '', '/');
          onSuccess(user);
        }, 2000);

      } catch (error) {
        console.error('❌ Callback error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setError(errorMessage);
        setStatus(`Error: ${errorMessage}`);
      }
    };

    handleCallback();
  }, [onSuccess]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="bg-red-100 p-4 rounded-full w-16 h-16 mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Setup Failed</h2>
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
            {progress === 100 ? (
              <CheckCircle className="w-8 h-8 text-white" />
            ) : (
              <Activity className="w-8 h-8 text-white" />
            )}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Setting Up RunSight</h2>
          
          <div className="mb-6">
            <div className="bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-gray-600 text-sm mb-2">{status}</p>
            
            {totalCount > 0 && (
              <div className="text-xs text-gray-500">
                <div>Processing: {processedCount}/{totalCount} activities</div>
                {currentActivity && (
                  <div className="truncate mt-1">Current: {currentActivity}</div>
                )}
              </div>
            )}
          </div>
          
          {progress < 100 && (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}
          
          {progress === 100 && (
            <p className="text-green-600 text-sm">Redirecting to your dashboard...</p>
          )}
        </div>
      </div>
    </div>
  );
};