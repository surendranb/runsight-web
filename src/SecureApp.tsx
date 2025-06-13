// src/SecureApp.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSecureAuth } from './hooks/useSecureAuth';
import SecureStravaCallback from './components/SecureStravaCallback';
// Duplicate imports for React, useSecureAuth, SecureStravaCallback removed
import { NavigationBar, SyncPeriod } from './components/NavigationBar';
import { SimpleDashboard } from './components/SimpleDashboard';
import { InsightsPage } from './components/InsightsPage';
import { User, EnrichedRun, RunStats } from './types';
import { apiClient, StravaPaginationParams } from './lib/secure-api-client'; // Import StravaPaginationParams

// View type consistent with NavigationBar and App.tsx's previous definition
type View = 'dashboard' | 'insights' | 'welcome' | 'callback' | 'loading' | 'goals' | 'settings';

// Define NextPageParams using the imported StravaPaginationParams
type NextPageParams = StravaPaginationParams | null;

const SecureApp: React.FC = () => {
  const {
    user: authUser,
    isLoading: authLoading,
    error: authError,
    initiateStravaAuth,
    logout: secureLogout,
    clearError: clearAuthError,
    handleStravaCallback // Make sure useSecureAuth exports this
  } = useSecureAuth();

  // Adapt user object from useSecureAuth if its structure is different, primarily for display name
  // For now, assume components will adapt to use `authUser.name`
  const user = authUser as User | null;

  const [currentView, setCurrentView] = useState<View>('loading');
  const [runs, setRuns] = useState<EnrichedRun[]>([]);
  // REMOVED: const [splits, setSplits] = useState<RunSplit[]>([]);
  const [stats, setStats] = useState<RunStats | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Sync specific states
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgressMessage, setSyncProgressMessage] = useState<string>('');
  const [nextPageToSync, setNextPageToSync] = useState<NextPageParams>(null);

  // Effect to handle view changes based on auth state (remains mostly the same)
  useEffect(() => {
    // ... (previous logic for setting currentView based on authLoading, user, callback path)
    if (authLoading) {
      setCurrentView('loading');
    } else if (window.location.pathname === '/auth/callback' || window.location.pathname === '/callback') {
      // Callback is handled by SecureStravaCallback component if no user yet
      // If user is hydrated by callback, this effect will run again
      if (!user) {
        setCurrentView('callback');
      } else {
        setCurrentView('dashboard'); // User just authenticated via callback
      }
    } else if (user) {
      setCurrentView('dashboard'); // Default view for logged-in user
    } else {
      setCurrentView('welcome'); // No user, not loading, not callback -> show welcome/login
    }
  }, [authLoading, user]);

  const fetchData = useCallback(async (isInitialLoad = false) => {
    if (!user || !user.id) {
      if (!isInitialLoad) setDataError("User ID is missing, cannot fetch data.");
      setRuns([]);
      setStats(null);
      setDataLoading(false);
      return;
    }

    if (!isInitialLoad) setDataLoading(true); // Avoid double loading indicator if auth is also loading
    if (!isInitialLoad) setDataError(null);
    try {
      const { runs: fetchedRuns, stats: fetchedStats } = await apiClient.getUserRuns(user.id);
      setRuns(fetchedRuns as EnrichedRun[]);
      setStats(fetchedStats);
    } catch (err: any) {
      console.error("SecureApp: Error fetching data via apiClient:", err);
      if (!isInitialLoad) setDataError(err.message || 'Failed to load activity data via apiClient.');
      setRuns([]); // Clear data on error too
      setStats(null);
    } finally {
      if (!isInitialLoad) setDataLoading(false);
    }
  }, [user]); // user is the dependency

  useEffect(() => {
    if (user && user.id && (currentView === 'dashboard' || currentView === 'insights')) {
      // Pass true if authLoading is also true to avoid double loading indicators
      fetchData(authLoading);
    }
  }, [user, user?.id, currentView, fetchData, authLoading]);


  const handleLogout = () => {
    secureLogout();
    setCurrentView('welcome');
    setRuns([]);
    setStats(null);
    setNextPageToSync(null); // Reset sync state
    setSyncProgressMessage('');
  };

  const processSyncChunk = useCallback(async (userId: string, params: NextPageParams) => {
    if (!params) { // Should not happen if called correctly
        setIsSyncing(false);
        setSyncProgressMessage('');
        await fetchData(); // Final data refresh
        return;
    }

    setSyncProgressMessage(`Syncing page ${params.page}...`);
    try {
      // This apiClient method will be created in the next step
      const result = await apiClient.processStravaActivityChunk(userId, params);

      if (result.isComplete) {
        setSyncProgressMessage('All activities synced!');
        setNextPageToSync(null);
        setIsSyncing(false); // Mark overall sync as complete
        alert(`Full sync complete! Processed ${result.processedCount} activities in this final chunk (Saved: ${result.savedCount}, Skipped: ${result.skippedCount}). Data will now refresh.`);
      } else {
        setSyncProgressMessage(`Page ${params.page} synced (${result.processedCount} activities). Fetching next...`);
        setNextPageToSync(result.nextPageParams); // Trigger next chunk via useEffect
      }
      await fetchData(); // Refresh data after each chunk for now
    } catch (error: any) {
      console.error('Sync chunk processing error. Backend response:', error.response?.data, 'Full error object:', error);

      const backendMessage = error.response?.data?.message;
      const backendStage = error.response?.data?.stage;
      let displayMessage = 'An unexpected error occurred during sync.';

      if (backendMessage) {
        displayMessage = backendMessage;
        if (backendStage) {
          displayMessage += ` (Stage: ${backendStage})`;
        }
      } else if (error.message) {
        displayMessage = error.message;
      }

      if (params?.page) {
        displayMessage = `Error on page ${params.page}: ${displayMessage}`;
      }

      setSyncProgressMessage(displayMessage);
      setDataError(displayMessage);
      alert(displayMessage); // Keep alert for immediate user feedback as per original

      setNextPageToSync(null); // Stop chunking on error
      setIsSyncing(false);
    }
  }, [fetchData]); // Add other dependencies if they are used inside (like setSyncProgressMessage, etc.)

  // Effect to automatically fetch the next chunk for sync
  useEffect(() => {
    if (nextPageToSync && user && user.id && isSyncing) {
      processSyncChunk(user.id, nextPageToSync);
    }
  }, [nextPageToSync, user, user?.id, isSyncing, processSyncChunk]); // Added user.id to dependencies

const getTimestamps = (period: SyncPeriod): { after: number; before: number } => {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date(); // Default end date is now for most cases

  switch (period) {
    case "14days":
      startDate = new Date();
      startDate.setDate(now.getDate() - 14);
      break;
    case "30days":
      startDate = new Date();
      startDate.setDate(now.getDate() - 30);
      break;
    case "60days":
      startDate = new Date();
      startDate.setDate(now.getDate() - 60);
      break;
    case "90days":
      startDate = new Date();
      startDate.setDate(now.getDate() - 90);
      break;
    case "thisYear":
      startDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0)); // Jan 1st current year UTC
      endDate = new Date(); // Sync up to now for "thisYear"
      break;
    case "lastYear":
      startDate = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1, 0, 0, 0)); // Jan 1st last year UTC
      endDate = new Date(Date.UTC(now.getUTCFullYear() - 1, 11, 31, 23, 59, 59)); // Dec 31st last year UTC
      break;
    case "allTime":
    default: // Default to allTime if somehow an invalid period is passed
      startDate = new Date(Date.UTC(2000, 0, 1, 0, 0, 0)); // Jan 1, 2000 UTC as a far-back date
      endDate = new Date(); // Sync up to now
      break;
  }

  // Ensure start date is at the beginning of the day for day-based calculations for consistency
  if (["14days", "30days", "60days", "90days"].includes(period)) {
       startDate.setUTCHours(0,0,0,0);
  }

  const afterEpochSec = Math.floor(startDate.getTime() / 1000);
  const beforeEpochSec = Math.floor(endDate.getTime() / 1000);

  return { after: afterEpochSec, before: beforeEpochSec };
};

  // Revised structure for handleSyncData
  const handleSyncData = async (period: SyncPeriod) => { // Make sure SyncPeriod is imported from NavigationBar
      if (!user || !user.id) {
          alert("Please log in to sync data.");
          return;
      }

      setIsSyncing(true);
      setDataError(null);
      // setSyncProgressMessage('Preparing to sync...'); // Initial message is now more specific

      try {
          setSyncProgressMessage(`Calculating time period for sync: ${period}...`); // Adjusted message

          const { after, before } = getTimestamps(period); // Directly proceed to timestamp calculation

          let readableAfter = new Date(after * 1000).toLocaleDateString();
          let readableBefore = new Date(before * 1000).toLocaleDateString();
          if (period === "allTime") readableAfter = "beginning of time"; // Or a specific date like "Jan 1, 2000"

          setSyncProgressMessage(`Syncing from ${readableAfter} to ${readableBefore}. Starting chunk processing...`);

          setNextPageToSync({
              page: 1,
              per_page: 50,
              after: after,
              before: before
          });
          // The useEffect for nextPageToSync will start processSyncChunk
      } catch (error: any) {
          // ... error handling for timestamp calculation or other initial setup before chunking
          console.error('Error during sync preparation (timestamp calculation):', error);
          setDataError(error.message || 'Failed to prepare sync.');
          alert('Sync preparation failed: ' + (error.message || 'Unknown error'));
          setIsSyncing(false);
          setSyncProgressMessage('');
      }
      // No finally block to reset isSyncing here, as processSyncChunk handles it
  };


  // ... (Callback, Loading, Welcome views remain the same) ...
  if (currentView === 'callback' && !user) {
    return <SecureStravaCallback />;
  }
  if (authLoading && currentView === 'loading') {
    return ( /* Original Loading JSX */ <div style={{minHeight: '100vh',display: 'flex',alignItems: 'center',justifyContent: 'center',background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',fontFamily: 'system-ui, -apple-system, sans-serif'}}><div style={{background: 'white',borderRadius: '16px',padding: '40px',textAlign: 'center',boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}><div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div><h2 style={{ color: '#1f2937', margin: 0 }}>Loading...</h2></div></div>);
  }
  if (!user && currentView === 'welcome') {
    return ( /* Original Welcome JSX with initiateStravaAuth and authError display */ <div style={{minHeight: '100vh',display: 'flex',alignItems: 'center',justifyContent: 'center',background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',fontFamily: 'system-ui, -apple-system, sans-serif'}}><div style={{background: 'white',borderRadius: '16px',padding: '40px',maxWidth: '500px',width: '90%',textAlign: 'center',boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}><div style={{fontSize: '64px',marginBottom: '24px'}}>🏃‍♂️</div><h1 style={{fontSize: '32px',fontWeight: '700',color: '#1f2937',marginBottom: '16px'}}>RunSight</h1><p style={{color: '#6b7280',marginBottom: '32px',fontSize: '18px',lineHeight: '1.6'}}>Discover insights from your running data. Connect Strava.</p>{authError && (<div style={{background: '#fef2f2',border: '1px solid #fecaca',borderRadius: '8px',padding: '16px',marginBottom: '24px'}}><p style={{color: '#dc2626',fontSize: '14px',margin: 0}}>❌ {authError}</p><button onClick={clearAuthError} style={{background: 'transparent',border: 'none',color: '#dc2626',fontSize: '12px',cursor: 'pointer',marginTop: '8px',textDecoration: 'underline'}}>Dismiss</button></div>)}<button onClick={initiateStravaAuth} style={{background: '#fc4c02',color: 'white',border: 'none',borderRadius: '8px',padding: '16px 32px',fontSize: '18px',fontWeight: '600',cursor: 'pointer',transition: 'all 0.2s',display: 'flex',alignItems: 'center',justifyContent: 'center',gap: '12px',width: '100%',marginBottom: '24px'}}> <span style={{ fontSize: '24px' }}>🔗</span> Connect with Strava </button></div></div>);
  }


  if (user) {
    return (
      <div className="min-h-screen bg-gray-100">
        <NavigationBar
          currentView={currentView}
          onNavigate={(viewName) => setCurrentView(viewName as View)}
          userName={user.name}
          onLogout={handleLogout}
          onSyncData={handleSyncData} // Pass the updated handler
          isSyncing={isSyncing}
        />

        {/* Display Sync Progress Message */}
        {isSyncing && syncProgressMessage && (
            <div className="bg-blue-100 border-t-4 border-blue-500 text-blue-700 px-4 py-3 shadow-md text-center" role="alert">
                <p className="font-bold">{syncProgressMessage}</p>
            </div>
        )}

        {currentView === 'dashboard' && (
          <SimpleDashboard
            user={user}
            onLogout={handleLogout}
            runs={runs}
            // splits prop was removed previously
            isLoading={dataLoading}
            error={dataError}
            // stats={stats} // Optionally pass stats
          />
        )}
        {currentView === 'insights' && (
          <InsightsPage
            user={user}
            runs={runs}
            isLoading={dataLoading}
            error={dataError}
          />
        )}
        {(currentView === 'goals' || currentView === 'settings') && (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-white shadow rounded-lg p-12 text-center">
                  <h2 className="text-2xl font-semibold text-gray-700">Coming Soon!</h2>
                  <p className="text-gray-500 mt-2">The '{currentView}' section is under construction.</p>
              </div>
          </main>
        )}
      </div>
    );
  }

  // Fallback / default (should ideally not be reached if logic above is correct)
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>Something went wrong. Current view: {currentView}. User authenticated: {!!user}</p>
    </div>
  );
};

export default SecureApp;