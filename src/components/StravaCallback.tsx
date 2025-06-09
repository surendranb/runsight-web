import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { exchangeCodeForToken, saveUserToDatabase } from '../lib/strava';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { DataSyncSelector } from './DataSyncSelector';

interface StravaCallbackProps {
  onLoginSuccess: (user: User) => void;
}

export const StravaCallback: React.FC<StravaCallbackProps> = ({ onLoginSuccess }) => {
  const [status, setStatus] = useState('Connecting to Strava...');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showDataSync, setShowDataSync] = useState(false);
  const [accessToken, setAccessToken] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [isFirstRun, setIsFirstRun] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent duplicate processing
      if (isProcessing) {
        console.log('OAuth processing already in progress, skipping...');
        return;
      }

      try {
        setIsProcessing(true);
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

        // Check if this code has already been processed
        const processedCode = sessionStorage.getItem('processed_oauth_code');
        if (processedCode === code) {
          // If we have user data, trigger login success which should lead to a redirect.
          const userData = sessionStorage.getItem('runsight_user');
          if (userData) {
            onLoginSuccess(JSON.parse(userData));
            // setIsProcessing(false) will be called in the finally block.
            // It's important that onLoginSuccess is called to navigate away.
            // If the component somehow still attempts to process, the top-level
            // isProcessing check should prevent re-entry into the main logic.
            return;
          }
          // If there's no user data, something is unexpected.
          // Allow processing to continue (or error out) rather than getting stuck.
          // However, the original code would have also returned here after setIsProcessing(false).
          // For safety and to maintain similar behavior for this edge case:
          setIsProcessing(false); // Or rely on the finally block, but being explicit here for this path.
          return;
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
        console.log('User saved successfully');
        
        setStatus('Checking existing data...');
        setProgress(80);

        // Check if user has existing enriched runs (to determine first run vs. subsequent run)
        const { count, error: countError } = await supabase
          .from('enriched_runs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (countError) {
          console.error("Error counting existing enriched_runs:", countError);
          // Default to isFirstRun = true on error to allow user to proceed with sync options,
          // as DataSyncSelector's duplicate check will prevent reprocessing existing runs.
          setIsFirstRun(true);
          setStatus('Error checking existing data. Proceeding as if first run.');
        } else {
          const newIsFirstRun = count === 0;
          setIsFirstRun(newIsFirstRun);
          if (!newIsFirstRun) {
            setStatus('Welcome back! Ready to sync new activities.');
          } else {
            setStatus('Welcome! Ready to import your running history.');
          }
        }
        setProgress(100);

        // Mark OAuth code as processed and store user data
        sessionStorage.setItem('processed_oauth_code', code);
        sessionStorage.setItem('runsight_user', JSON.stringify({
          id: user.id,
          strava_id: user.strava_id,
          first_name: user.first_name,
          last_name: user.last_name,
          profile_medium: user.profile_medium
        }));

        // Store access token and user ID for data sync
        setAccessToken(authResponse.access_token);
        setUserId(user.id);
        setShowDataSync(true);
        
      } catch (error) {
        console.error('Callback error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setError(errorMessage);
        setStatus(`Error: ${errorMessage}`);
      } finally {
        setIsProcessing(false);
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

  if (showDataSync && accessToken && userId) {
    return (
      <DataSyncSelector 
        accessToken={accessToken} 
        userId={userId}
        isFirstRun={isFirstRun}
        onSyncComplete={(data) => {
          console.log('Sync completed with data:', data);
          onLoginSuccess({ 
            id: userId, 
            strava_id: 20683290, 
            first_name: 'Surendran', 
            last_name: 'Balachandran', 
            profile_medium: '' 
          });
        }}
        onSkip={() => {
          onLoginSuccess({ 
            id: userId, 
            strava_id: 20683290, 
            first_name: 'Surendran', 
            last_name: 'Balachandran', 
            profile_medium: '' 
          });
        }}
      />
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