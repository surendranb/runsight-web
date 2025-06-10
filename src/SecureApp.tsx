// src/SecureApp.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSecureAuth } from './hooks/useSecureAuth';
import SecureStravaCallback from './components/SecureStravaCallback';
import { NavigationBar } from './components/NavigationBar';
import { SimpleDashboard } from './components/SimpleDashboard';
import { InsightsPage } from './components/InsightsPage';
import { User, EnrichedRun, RunSplit } from './types'; // Use our main types
import { supabase } from './lib/supabase'; // For direct data fetching
import { apiClient } from './lib/secure-api-client'; // For sync functionality

// View type consistent with NavigationBar and App.tsx's previous definition
type View = 'dashboard' | 'insights' | 'welcome' | 'callback' | 'loading' | 'goals' | 'settings';

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
  const user = authUser as User | null; // Cast or map if User types differ significantly

  const [currentView, setCurrentView] = useState<View>('loading');
  const [runs, setRuns] = useState<EnrichedRun[]>([]);
  const [splits, setSplits] = useState<RunSplit[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);


  // Effect to handle view changes based on auth state
  useEffect(() => {
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

  // Effect to fetch data when user is available and view requires it
  useEffect(() => {
    if (user && user.id && (currentView === 'dashboard' || currentView === 'insights')) {
      const fetchData = async () => {
        setDataLoading(true);
        setDataError(null);
        try {
          // Fetch enriched_runs (detailed runs for insights)
          const { data: runsData, error: runsError } = await supabase
            .from('runs') // Using 'runs' table as identified for EnrichedRun data
            .select('*')
            .eq('user_id', user.id)
            .order('start_date', { ascending: false });
          if (runsError) throw runsError;
          setRuns(runsData || []);

          // Fetch run_splits
          const { data: splitsData, error: splitsError } = await supabase
            .from('run_splits')
            .select('*')
            .eq('user_id', user.id)
            .order('enriched_run_id', { ascending: true })
            .order('split_number', { ascending: true });
          if (splitsError) throw splitsError;
          setSplits(splitsData || []);

        } catch (err: any) {
          console.error("SecureApp: Error fetching data:", err);
          setDataError(err.message || 'Failed to load activity data.');
          setRuns([]);
          setSplits([]);
        } finally {
          setDataLoading(false);
        }
      };
      fetchData();
    }
  }, [user, user?.id, currentView]);


  const handleLogout = () => {
    secureLogout(); // This comes from useSecureAuth
    setCurrentView('welcome'); // Reset view
    setRuns([]); // Clear data
    setSplits([]);
  };

  const handleSyncData = async () => {
      if (!user || !user.id) return;
      setIsSyncing(true);
      setDataError(null); // Clear previous errors
      try {
          const result = await apiClient.syncUserData(user.id, 30); // Sync last 30 days
          alert(`Sync complete! Added ${result.savedCount} new runs, skipped ${result.skippedCount}. Data will refresh.`);
          // Re-fetch data by triggering the data fetching useEffect
          // A simple way is to temporarily change currentView and change it back, or add a manual refetch trigger
          // For now, let's rely on the existing useEffect by just setting dataLoading to true
          // which will show loading indicator, and then data will be re-fetched if view changes or user changes.
          // Forcing a re-fetch of data:
          if (user && user.id && (currentView === 'dashboard' || currentView === 'insights')) {
            setDataLoading(true); // Show loading
             // Fetch enriched_runs (detailed runs for insights)
            const { data: runsData, error: runsError } = await supabase
              .from('runs') .select('*').eq('user_id', user.id).order('start_date', { ascending: false });
            if (runsError) throw runsError;
            setRuns(runsData || []);
             // Fetch run_splits
            const { data: splitsData, error: splitsError } = await supabase
              .from('run_splits').select('*').eq('user_id', user.id).order('enriched_run_id', { ascending: true }).order('split_number', { ascending: true });
            if (splitsError) throw splitsError;
            setSplits(splitsData || []);
            setDataLoading(false);
          }

      } catch (error: any) {
          console.error('Sync failed:', error);
          setDataError(error.message || 'Sync failed');
          alert('Sync failed: ' + (error.message || 'Unknown error'));
      } finally {
          setIsSyncing(false);
      }
  };


  // Handle OAuth callback explicitly
  if (currentView === 'callback' && !user) {
    // SecureStravaCallback should handle the API call and then useSecureAuth will update user state
    // which will trigger re-render and view change via useEffect.
    return <SecureStravaCallback />;
  }

  // Loading state from auth
  if (authLoading && currentView === 'loading') {
    return ( /* Original loading JSX from SecureApp */
        <div style={{minHeight: '100vh',display: 'flex',alignItems: 'center',justifyContent: 'center',background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',fontFamily: 'system-ui, -apple-system, sans-serif'}}>
            <div style={{background: 'white',borderRadius: '16px',padding: '40px',textAlign: 'center',boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div><h2 style={{ color: '#1f2937', margin: 0 }}>Loading...</h2>
            </div>
        </div>
    );
  }

  // Unauthenticated - show landing page (original from SecureApp)
  if (!user && currentView === 'welcome') {
    return ( /* Original Welcome/Login JSX from SecureApp */
        <div style={{minHeight: '100vh',display: 'flex',alignItems: 'center',justifyContent: 'center',background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',fontFamily: 'system-ui, -apple-system, sans-serif'}}>
            <div style={{background: 'white',borderRadius: '16px',padding: '40px',maxWidth: '500px',width: '90%',textAlign: 'center',boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}>
                <div style={{fontSize: '64px',marginBottom: '24px'}}>🏃‍♂️</div>
                <h1 style={{fontSize: '32px',fontWeight: '700',color: '#1f2937',marginBottom: '16px'}}>RunSight</h1>
                <p style={{color: '#6b7280',marginBottom: '32px',fontSize: '18px',lineHeight: '1.6'}}>Discover insights from your running data. Connect Strava.</p>
                {authError && (<div style={{background: '#fef2f2',border: '1px solid #fecaca',borderRadius: '8px',padding: '16px',marginBottom: '24px'}}><p style={{color: '#dc2626',fontSize: '14px',margin: 0}}>❌ {authError}</p><button onClick={clearAuthError} style={{background: 'transparent',border: 'none',color: '#dc2626',fontSize: '12px',cursor: 'pointer',marginTop: '8px',textDecoration: 'underline'}}>Dismiss</button></div>)}
                <button onClick={initiateStravaAuth} style={{background: '#fc4c02',color: 'white',border: 'none',borderRadius: '8px',padding: '16px 32px',fontSize: '18px',fontWeight: '600',cursor: 'pointer',transition: 'all 0.2s',display: 'flex',alignItems: 'center',justifyContent: 'center',gap: '12px',width: '100%',marginBottom: '24px'}}> <span style={{ fontSize: '24px' }}>🔗</span> Connect with Strava </button>
                {/* ... other welcome page elements from original SecureApp ... */}
            </div>
        </div>
    );
  }

  // Authenticated user - render application with NavigationBar
  if (user) {
    return (
      <div className="min-h-screen bg-gray-100"> {/* Using Tailwind class for consistency */}
        <NavigationBar
          currentView={currentView}
          onNavigate={(viewName) => setCurrentView(viewName as View)}
          userName={user.name} // Pass user name for display
          onLogout={handleLogout}
          onSyncData={handleSyncData} // Pass sync function
          isSyncing={isSyncing} // Pass syncing state
        />

        {/* Main content area */}
        {currentView === 'dashboard' && (
          <SimpleDashboard
            user={user}
            onLogout={handleLogout} // Kept if SimpleDashboard has specific logout needs, else remove
            runs={runs}
            splits={splits}
            isLoading={dataLoading} // Use dataLoading for content area
            error={dataError}
          />
        )}
        {currentView === 'insights' && (
          <InsightsPage
            user={user}
            runs={runs}
            isLoading={dataLoading} // Use dataLoading for content area
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
      <p>Something went wrong. Current view: {currentView}</p>
    </div>
  );
};

export default SecureApp;