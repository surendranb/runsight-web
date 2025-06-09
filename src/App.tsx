// src/App.tsx
import React, { useState, useEffect } from 'react';
import { Welcome } from './components/Welcome';
import { SimpleStravaCallback } from './components/SimpleStravaCallback';
import { SimpleDashboard } from './components/SimpleDashboard';
import { InsightsPage } from './components/InsightsPage';
import { NavigationBar } from './components/NavigationBar';
import { useSimpleAuth } from './hooks/useSimpleAuth';
import { supabase } from './lib/supabase';
import { EnrichedRun, RunSplit, User } from './types';

console.log('DEBUG: App.tsx module evaluating');

type View = 'dashboard' | 'insights' | 'welcome' | 'callback' | 'loading' | 'goals' | 'settings';

function App() {
  console.log('DEBUG: App() function component executing');

  const { user, loading: authLoading, login, logout } = useSimpleAuth();
  console.log('DEBUG: App() - useSimpleAuth() hook results:', { user, authLoading });

  const [currentView, setCurrentView] = useState<View>('loading');
  console.log('DEBUG: App() - useState currentView initial:', currentView);

  const [runs, setRuns] = useState<EnrichedRun[]>([]);
  const [splits, setSplits] = useState<RunSplit[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);
  console.log('DEBUG: App() - useState for data initial:', { runsLength: runs.length, splitsLength: splits.length, dataLoading, dataError });

  useEffect(() => {
    console.log('DEBUG: App() - useEffect [authLoading, user] executing. Current values:', { authLoading, userId: user?.id, currentView });
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const isCallbackRoute = (window.location.pathname === '/callback' || code);
    console.log('DEBUG: App() - useEffect [authLoading, user] - URL params:', { path: window.location.pathname, code, isCallbackRoute });

    let newView: View = currentView;
    if (authLoading) {
      newView = 'loading';
    } else if (isCallbackRoute && !user) {
      newView = 'callback';
    } else if (user) {
      newView = 'dashboard';
    } else {
      newView = 'welcome';
    }
    console.log('DEBUG: App() - useEffect [authLoading, user] - determined newView:', newView, 'Previous currentView was:', currentView);
    if (newView !== currentView) {
        setCurrentView(newView);
        console.log('DEBUG: App() - useEffect [authLoading, user] - called setCurrentView with:', newView);
    }
  }, [authLoading, user]); // Removed currentView from dependency array as it's set here

  useEffect(() => {
    console.log('DEBUG: App() - useEffect [user, user?.id, currentView] for data fetching executing. Current values:', { userId: user?.id, currentView });
    if (user && (currentView === 'dashboard' || currentView === 'insights')) {
      const fetchData = async () => {
        console.log('DEBUG: App() - fetchData() called for user:', user.id, 'and view:', currentView);
        if (!user.id) {
          console.error('DEBUG: App() - fetchData() - User ID is missing, cannot fetch data.');
          setDataError("User ID is missing, cannot fetch data.");
          setDataLoading(false);
          return;
        }
        setDataLoading(true);
        setDataError(null);
        console.log('DEBUG: App() - fetchData() - Set dataLoading=true, dataError=null');
        try {
          console.log('DEBUG: App() - fetchData() - Attempting to fetch runs for user_id:', user.id);
          const { data: runsData, error: runsError } = await supabase
            .from('runs')
            .select('*')
            .eq('user_id', user.id)
            .order('start_date', { ascending: false });

          if (runsError) {
            console.error('DEBUG: App() - fetchData() - Error fetching runs:', runsError);
            throw runsError;
          }
          setRuns(runsData || []);
          console.log('DEBUG: App() - fetchData() - Fetched runs. Count:', runsData?.length || 0);

          console.log('DEBUG: App() - fetchData() - Attempting to fetch run_splits for user_id:', user.id);
          const { data: splitsData, error: splitsError } = await supabase
            .from('run_splits')
            .select('*')
            .eq('user_id', user.id)
            .order('enriched_run_id', { ascending: true })
            .order('split_number', { ascending: true });

          if (splitsError) {
            console.error('DEBUG: App() - fetchData() - Error fetching run_splits:', splitsError);
            throw splitsError; // Or handle more gracefully if splits are optional
          }
          setSplits(splitsData || []);
          console.log('DEBUG: App() - fetchData() - Fetched run_splits. Count:', splitsData?.length || 0);

        } catch (err: any) {
          console.error('DEBUG: App() - fetchData() - Catch block error:', err);
          const message = err.message || 'Failed to load activity data.';
          setDataError(`Error: ${message}. Check if RLS policies on 'runs' and 'run_splits' tables are correct and if the user ID matches.`);
          setRuns([]);
          setSplits([]);
        } finally {
          setDataLoading(false);
          console.log('DEBUG: App() - fetchData() - Finally block. Set dataLoading=false.');
        }
      };
      fetchData();
    } else if (!user && (currentView === 'dashboard' || currentView === 'insights')) {
      console.log('DEBUG: App() - useEffect [user, user?.id, currentView] - No user, but view is dashboard/insights. Resetting.');
      setRuns([]);
      setSplits([]);
      setCurrentView('welcome');
    } else {
      console.log('DEBUG: App() - useEffect [user, user?.id, currentView] - Conditions for data fetch not met (user not present or view is not dashboard/insights).', { userExists: !!user, currentView });
    }
  }, [user, user?.id, currentView]);


  console.log('DEBUG: App() - Before rendering. Current state:', { currentView, authLoading, userId: user?.id, dataLoading, dataError, runsCount: runs.length });

  if (currentView === 'loading' || authLoading) {
    console.log('DEBUG: App() - Rendering Loading View');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (currentView === 'callback') {
    console.log('DEBUG: App() - Rendering Strava Callback View');
    return <SimpleStravaCallback onSuccess={login} />;
  }

  if (currentView === 'welcome' || !user) {
    console.log('DEBUG: App() - Rendering Welcome View (user may be null here)');
    return <Welcome />;
  }

  const handleLogout = () => {
    console.log('DEBUG: App() - handleLogout called');
    logout();
    setRuns([]);
    setSplits([]);
    setCurrentView('welcome');
  };

  console.log('DEBUG: App() - Rendering Authenticated Views Area. CurrentView:', currentView);
  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar
        currentView={currentView}
        onNavigate={(viewName) => {
          console.log('DEBUG: App() - NavigationBar onNavigate called with viewName:', viewName);
          setCurrentView(viewName as View);
        }}
      />
      <div className="absolute top-4 right-4 z-50">
        {user && (
            <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-700 text-white text-xs px-3 py-1 rounded-md shadow"
            >
                Logout
            </button>
        )}
      </div>

      {currentView === 'dashboard' && (
        <>
          {console.log('DEBUG: App() - Rendering SimpleDashboard. Props:', { userId: user?.id, runsCount: runs.length, splitsCount: splits.length, dataLoading, dataError })}
          <SimpleDashboard
            user={user}
            onLogout={handleLogout}
            runs={runs}
            splits={splits}
            isLoading={dataLoading}
            error={dataError}
            onNavigateToInsights={() => { // This prop is still here from previous version, will be removed in cleanup
                console.log('DEBUG: App() - SimpleDashboard onNavigateToInsights (old prop) called');
                setCurrentView('insights');
            }}
          />
        </>
      )}
      {currentView === 'insights' && (
        <>
          {console.log('DEBUG: App() - Rendering InsightsPage. Props:', { userId: user?.id, runsCount: runs.length, dataLoading, dataError })}
          <InsightsPage
            user={user}
            runs={runs}
            isLoading={dataLoading}
            error={dataError}
            onNavigateToDashboard={() => { // This prop is still here, will be removed
                console.log('DEBUG: App() - InsightsPage onNavigateToDashboard (old prop) called');
                setCurrentView('dashboard');
            }}
          />
        </>
      )}
      {(currentView === 'goals' || currentView === 'settings') && (
        <>
          {console.log('DEBUG: App() - Rendering Placeholder View for:', currentView)}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-white shadow rounded-lg p-12 text-center">
                  <h2 className="text-2xl font-semibold text-gray-700">Coming Soon!</h2>
                  <p className="text-gray-500 mt-2">The '{currentView}' section is under construction.</p>
              </div>
          </main>
        </>
      )}
    </div>
  );
}

export default App;