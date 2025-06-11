// src/SecureApp.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSecureAuth } from './hooks/useSecureAuth';
import SecureStravaCallback from './components/SecureStravaCallback';
import { NavigationBar, SyncPeriod } from './components/NavigationBar'; // Import SyncPeriod
import { SimpleDashboard } from './components/SimpleDashboard';
import { InsightsPage } from './components/InsightsPage';
import { User, EnrichedRun, RunStats } from './types';
import { apiClient } from './lib/secure-api-client';

// View type consistent with NavigationBar and App.tsx's previous definition
type View = 'dashboard' | 'insights' | 'welcome' | 'callback' | 'loading' | 'goals' | 'settings' | 'strava_setup';

const SecureApp: React.FC = () => {
  const {
    user: authUser, // This is the user profile from useSecureAuth (e.g., from localStorage)
    isLoading: authIsLoading, // isLoading from useSecureAuth
    error: authError,
    initiateStravaAuth,
    logout: secureLogout,
    clearError: clearAuthError,
    handleStravaCallback, // Make sure useSecureAuth exports this
    isAuthenticated, // From useSecureAuth, based on Supabase session + local profile
    getAccessToken // From useSecureAuth
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
  type NextPageParams = { page: number } | null; // Define NextPageParams if not already globally
  const [nextPageToSync, setNextPageToSync] = useState<NextPageParams>(null); // For "All Time" chunking

  // State for Strava keys configuration
  const [stravaKeysConfigured, setStravaKeysConfigured] = useState<boolean | null>(null);
  const [isCheckingKeys, setIsCheckingKeys] = useState<boolean>(false);

  const checkKeysConfiguration = useCallback(async () => {
    if (!isAuthenticated || !getAccessToken) { // Use isAuthenticated from useSecureAuth
      setStravaKeysConfigured(null); // Reset if not authenticated
      return;
    }

    setIsCheckingKeys(true);
    setStravaKeysConfigured(null);
    try {
      const token = await getAccessToken();
      if (token) {
        const status = await apiClient.checkStravaKeysStatus(token);
        setStravaKeysConfigured(status.configured);
        if (status.error) {
            console.warn("[SecureApp] Error message from checkStravaKeysStatus:", status.error);
        }
      } else {
        console.error("[SecureApp] Could not retrieve access token to check Strava keys status.");
        setStravaKeysConfigured(false);
      }
    } catch (error) {
      console.error('[SecureApp] Failed to check Strava keys configuration:', error);
      setStravaKeysConfigured(false);
    } finally {
      setIsCheckingKeys(false);
    }
  }, [isAuthenticated, getAccessToken]);

  useEffect(() => {
    if (isAuthenticated) {
      checkKeysConfiguration();
    } else {
      setStravaKeysConfigured(null);
    }
  }, [isAuthenticated, checkKeysConfiguration]);

  // Effect to handle view changes based on auth state
  useEffect(() => {
    if (authIsLoading) { // Use authIsLoading from useSecureAuth
      setCurrentView('loading');
    } else if (window.location.pathname === '/auth/callback' || window.location.pathname === '/callback') {
      if (!user) { // user here refers to authUser from useSecureAuth
        setCurrentView('callback');
      } else {
        // If user is present, isAuthenticated should be true. Then check keys.
        // This effect might run multiple times. Key check will determine final view.
        // For now, let's assume dashboard, and the key check logic will override if needed.
        setCurrentView('dashboard');
      }
    } else if (isAuthenticated && user) { // Use isAuthenticated
      // If keys are not configured, this will be handled by the main render logic
      // to show StravaApiSetupForm. Default to dashboard if keys are configured or check pending.
      setCurrentView('dashboard');
    } else {
      setCurrentView('welcome');
    }
  }, [authIsLoading, user, isAuthenticated]); // Added isAuthenticated

  const handleSetupComplete = () => {
    setStravaKeysConfigured(true);
    setCurrentView('dashboard'); // Navigate to dashboard after setup
  };

  const fetchData = useCallback(async (isInitialLoad = false) => {
    if (!user || !user.id || !stravaKeysConfigured) { // Also check if keys are configured
      if (!isInitialLoad) setDataError("User ID is missing or Strava keys not configured, cannot fetch data.");
      setRuns([]);
      setStats(null);
      setDataLoading(false);
      return;
    }

    if (!isInitialLoad) setDataLoading(true);
    if (!isInitialLoad) setDataError(null);
    try {
      const { runs: fetchedRuns, stats: fetchedStats } = await apiClient.getUserRuns(user.id);
      setRuns(fetchedRuns as EnrichedRun[]);
      setStats(fetchedStats);
    } catch (err: any) {
      console.error("[SecureApp] Error fetching data via apiClient:", err);
      if (!isInitialLoad) setDataError(err.message || 'Failed to load activity data via apiClient.');
      setRuns([]);
      setStats(null);
    } finally {
      if (!isInitialLoad) setDataLoading(false);
    }
  }, [user, stravaKeysConfigured]); // Added stravaKeysConfigured

  useEffect(() => {
    // Fetch data if user is authenticated, keys are configured, and on a data-displaying view
    if (isAuthenticated && user && user.id && stravaKeysConfigured && (currentView === 'dashboard' || currentView === 'insights')) {
      fetchData(authIsLoading); // Pass authIsLoading
    }
  }, [isAuthenticated, user, user?.id, currentView, fetchData, authIsLoading, stravaKeysConfigured]); // Added isAuthenticated, authIsLoading, stravaKeysConfigured


  const handleLogout = () => {
    secureLogout();
    // setCurrentView will be handled by the useEffect listening to isAuthenticated/user
    setRuns([]);
    setStats(null);
    setNextPageToSync(null);
    setSyncProgressMessage('');
    setStravaKeysConfigured(null); // Reset this on logout
  };

  type NextPageParams = { page: number } | null; // Ensure NextPageParams is defined if not already
  const processSyncChunk = useCallback(async (userId: string, params: NextPageParams) => {
    if (!params || !stravaKeysConfigured) {
        setIsSyncing(false);
        setSyncProgressMessage('');
        await fetchData();
        return;
    }

    setSyncProgressMessage(`Syncing page ${params.page}...`);
    try {
      const result = await apiClient.processStravaActivityChunk(userId, params);

      if (result.isComplete) {
        setSyncProgressMessage('All activities synced!');
        setNextPageToSync(null);
        setIsSyncing(false);
        alert(`Full sync complete! Processed ${result.processedActivityCount} activities in this final chunk (Saved: ${result.savedCount}, Skipped: ${result.skippedCount}). Data will now refresh.`);
      } else {
        setSyncProgressMessage(`Page ${params.page} synced (${result.processedActivityCount} activities). Fetching next...`);
        setNextPageToSync(result.nextPageParams);
      }
      await fetchData();
    } catch (error: any) {
      console.error('[SecureApp] All Time Sync chunk failed:', error);
      setDataError(error.message || 'An error occurred during "All Time" sync.');
      setSyncProgressMessage(`Error on page ${params.page}: ${error.message}`);
      setNextPageToSync(null);
      setIsSyncing(false);
      alert('Sync Error: ' + (error.message || 'Unknown error during sync.'));
    }
  }, [fetchData, stravaKeysConfigured]); // Added stravaKeysConfigured

  // Effect to automatically fetch the next chunk for "All Time" sync
  useEffect(() => {
    if (nextPageToSync && user && user.id && isSyncing && stravaKeysConfigured) {
      processSyncChunk(user.id, nextPageToSync);
    }
  }, [nextPageToSync, user, isSyncing, processSyncChunk, stravaKeysConfigured]); // Added stravaKeysConfigured


  const handleSyncData = async (period: SyncPeriod) => {
      if (!user || !user.id) {
          alert("Please log in to sync data.");
          return;
      }
      if (!stravaKeysConfigured) {
          alert("Strava API keys are not configured. Please set them up first.");
          setCurrentView('strava_setup'); // Optionally navigate to setup
          return;
      }

      setIsSyncing(true);
      setDataError(null);
      setSyncProgressMessage('Starting data sync...');

      if (period === 'all') {
        setNextPageToSync({ page: 1 });
      } else {
        try {
          setSyncProgressMessage(`Syncing last ${period} days...`);
          const result = await apiClient.syncUserData(user.id, period as number);
          alert(`Sync complete! Added ${result.savedCount} new runs, skipped ${result.skippedCount} from the last ${period} days. Data will refresh.`);
          await fetchData();
        } catch (error: any) {
          console.error(`[SecureApp] Sync for ${period} days failed:`, error);
          setDataError(error.message || `Sync for ${period} days failed.`);
          alert(`Sync failed for ${period} days: ` + (error.message || 'Unknown error'));
        } finally {
          setIsSyncing(false);
          setSyncProgressMessage('');
        }
      }
  };

  // Import StravaApiSetupForm if not already
  // import StravaApiSetupForm from './components/StravaApiSetupForm';
  // Ensure SecureStravaCallback is imported
  // import SecureStravaCallback from './components/SecureStravaCallback';

  // Loading states
  if (authIsLoading || (isAuthenticated && isCheckingKeys)) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-xl font-semibold text-gray-700">Loading application...</div>
      </div>
    );
  }

  // Not authenticated: Welcome/Login
  if (!isAuthenticated) {
    // The SecureStravaCallback needs to be routable or handled here if path matches
    if (window.location.pathname === '/auth/callback' || window.location.pathname === '/callback') {
        return <SecureStravaCallback />;
    }
    return ( <div style={{minHeight: '100vh',display: 'flex',alignItems: 'center',justifyContent: 'center',background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',fontFamily: 'system-ui, -apple-system, sans-serif'}}><div style={{background: 'white',borderRadius: '16px',padding: '40px',maxWidth: '500px',width: '90%',textAlign: 'center',boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}><div style={{fontSize: '64px',marginBottom: '24px'}}>🏃‍♂️</div><h1 style={{fontSize: '32px',fontWeight: '700',color: '#1f2937',marginBottom: '16px'}}>RunSight</h1><p style={{color: '#6b7280',marginBottom: '32px',fontSize: '18px',lineHeight: '1.6'}}>Discover insights from your running data. Connect Strava.</p>{authError && (<div style={{background: '#fef2f2',border: '1px solid #fecaca',borderRadius: '8px',padding: '16px',marginBottom: '24px'}}><p style={{color: '#dc2626',fontSize: '14px',margin: 0}}>❌ {authError}</p><button onClick={clearAuthError} style={{background: 'transparent',border: 'none',color: '#dc2626',fontSize: '12px',cursor: 'pointer',marginTop: '8px',textDecoration: 'underline'}}>Dismiss</button></div>)}<button onClick={initiateStravaAuth} style={{background: '#fc4c02',color: 'white',border: 'none',borderRadius: '8px',padding: '16px 32px',fontSize: '18px',fontWeight: '600',cursor: 'pointer',transition: 'all 0.2s',display: 'flex',alignItems: 'center',justifyContent: 'center',gap: '12px',width: '100%',marginBottom: '24px'}}> <span style={{ fontSize: '24px' }}>🔗</span> Connect with Strava </button></div></div>);
  }

  // Authenticated: Check key configuration
  if (stravaKeysConfigured === null) { // Still checking keys
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
         <div className="text-xl font-semibold text-gray-700">Checking configuration...</div>
      </div>
    );
  }

  // Main application content for authenticated users
  return (
    <div className="min-h-screen bg-gray-100">
      {user && <NavigationBar // user should be present if isAuthenticated
        currentView={stravaKeysConfigured === false ? 'strava_setup' : currentView}
        onNavigate={(viewName) => {
            if (stravaKeysConfigured === false && viewName !== 'strava_setup') {
                setCurrentView('strava_setup'); // Force setup if keys not configured
            } else {
                setCurrentView(viewName as View);
            }
        }}
        userName={user.name}
        onLogout={handleLogout}
        onSyncData={handleSyncData}
        isSyncing={isSyncing}
      />}

      {isSyncing && syncProgressMessage && (
          <div className="bg-blue-100 border-t-4 border-blue-500 text-blue-700 px-4 py-3 shadow-md text-center" role="alert">
              <p className="font-bold">{syncProgressMessage}</p>
          </div>
      )}

      {stravaKeysConfigured === false ? (
        <main className="container mx-auto p-4">
            <StravaApiSetupForm onSetupComplete={handleSetupComplete} />
        </main>
      ) : (
        // Keys are configured, show regular views based on currentView
        <>
          {currentView === 'dashboard' && (
            <SimpleDashboard
              user={user!} // user is non-null here
              onLogout={handleLogout} // Not typically on dashboard, but was in original
              runs={runs}
              isLoading={dataLoading}
              error={dataError}
            />
          )}
          {currentView === 'insights' && (
            <InsightsPage
              user={user!} // user is non-null here
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
           {/* Handle callback route if authenticated and keys configured, though usually handled before this point */}
          {(currentView === 'callback' && (window.location.pathname === '/auth/callback' || window.location.pathname === '/callback')) && <SecureStravaCallback /> }

        </>
      )}
    </div>
  );
};

export default SecureApp;