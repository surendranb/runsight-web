// src/SecureApp.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSecureAuth } from './hooks/useSecureAuth';
import SecureStravaCallback from './components/SecureStravaCallback';
import React, { useState, useEffect, useCallback } from 'react';
import { useSecureAuth } from './hooks/useSecureAuth';
import SecureStravaCallback from './components/SecureStravaCallback';
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
      console.error('All Time Sync chunk failed:', error);
      setDataError(error.message || 'An error occurred during "All Time" sync.');
      setSyncProgressMessage(`Error on page ${params.page}: ${error.message}`);
      setNextPageToSync(null); // Stop chunking on error
      setIsSyncing(false);
      alert('Sync Error: ' + (error.message || 'Unknown error during sync.'));
    }
  }, [fetchData]); // Add other dependencies if they are used inside (like setSyncProgressMessage, etc.)

  // Effect to automatically fetch the next chunk for sync
  useEffect(() => {
    if (nextPageToSync && user && user.id && isSyncing) {
      processSyncChunk(user.id, nextPageToSync);
    }
  }, [nextPageToSync, user, user?.id, isSyncing, processSyncChunk]); // Added user.id to dependencies


  const handleSyncData = async (period: SyncPeriod) => {
      if (!user || !user.id) {
          alert("Please log in to sync data.");
          return;
      }

      setIsSyncing(true);
      setDataError(null);
      setSyncProgressMessage('Starting data sync...');

      if (typeof period === 'string' && period.startsWith('year-')) {
        const year = parseInt(period.split('-')[1], 10);
        // UTC dates for Jan 1st and Dec 31st
        const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0)); // Month is 0-indexed
        const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59)); // Month is 0-indexed

        const afterTimestamp = Math.floor(startDate.getTime() / 1000);
        const beforeTimestamp = Math.floor(endDate.getTime() / 1000);

        setSyncProgressMessage(`Preparing to sync activities for ${year}...`);
        setNextPageToSync({
            page: 1,
            per_page: 50, // Default chunk size, Strava might override
            after: afterTimestamp,
            before: beforeTimestamp
        });
        // The useEffect for nextPageToSync will start the processSyncChunk
      } else if (typeof period === 'number') { // Handle fixed periods (7, 30, 90, 180 days)
        try {
          setSyncProgressMessage(`Syncing last ${period} days...`);
          const result = await apiClient.syncUserData(user.id, period); // period is already number
          alert(`Sync complete! Added ${result.savedCount} new runs, skipped ${result.skippedCount} from the last ${period} days. Data will refresh.`);
          await fetchData();
        } catch (error: any) {
          console.error(`Sync for ${period} days failed:`, error);
          setDataError(error.message || `Sync for ${period} days failed.`);
          alert(`Sync failed for ${period} days: ` + (error.message || 'Unknown error'));
        } finally {
          setIsSyncing(false);
          setSyncProgressMessage('');
        }
      } else {
        console.warn("Unsupported sync period:", period);
        setIsSyncing(false);
        setSyncProgressMessage('');
      }
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