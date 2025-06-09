// src/App.tsx
import React, { useState, useEffect } from 'react';
import { Welcome } from './components/Welcome';
import { SimpleStravaCallback } from './components/SimpleStravaCallback';
import { SimpleDashboard } from './components/SimpleDashboard';
import { InsightsPage } from './components/InsightsPage';
import { NavigationBar } from './components/NavigationBar'; // Import NavigationBar
import { useSimpleAuth } from './hooks/useSimpleAuth';
import { supabase } from './lib/supabase';
import { EnrichedRun, RunSplit, User } from './types';

// Ensure this View type is comprehensive for App's logic and NavigationBar's needs
type View = 'dashboard' | 'insights' | 'welcome' | 'callback' | 'loading' | 'goals' | 'settings';

function App() {
  const { user, loading: authLoading, login, logout } = useSimpleAuth();
  const [currentView, setCurrentView] = useState<View>('loading');

  const [runs, setRuns] = useState<EnrichedRun[]>([]);
  const [splits, setSplits] = useState<RunSplit[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // useEffect for view based on auth state (remains largely the same)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const isCallbackRoute = (window.location.pathname === '/callback' || code);

    if (authLoading) {
      setCurrentView('loading');
    } else if (isCallbackRoute && !user) {
      setCurrentView('callback');
    } else if (user) {
      setCurrentView('dashboard');
    } else {
      setCurrentView('welcome');
    }
  }, [authLoading, user]);

  // useEffect for data fetching (remains the same)
  useEffect(() => {
    if (user && (currentView === 'dashboard' || currentView === 'insights')) {
      const fetchData = async () => {
        if (!user.id) {
          setDataError("User ID is missing, cannot fetch data.");
          setDataLoading(false);
          return;
        }
        setDataLoading(true);
        setDataError(null);
        try {
          const { data: runsData, error: runsError } = await supabase
            .from('runs')
            .select('*')
            .eq('user_id', user.id)
            .order('start_date', { ascending: false });
          if (runsError) throw runsError;
          setRuns(runsData || []);

          const { data: splitsData, error: splitsError } = await supabase
            .from('run_splits')
            .select('*')
            .eq('user_id', user.id)
            .order('enriched_run_id', { ascending: true })
            .order('split_number', { ascending: true });
          if (splitsError) throw splitsError;
          setSplits(splitsData || []);
        } catch (err: any) {
          console.error("Error fetching data in App.tsx:", err);
          const message = err.message || 'Failed to load activity data.';
          setDataError(`Error: ${message}. Check if RLS policies on 'runs' and 'run_splits' tables are correct and if the user ID matches.`);
          setRuns([]);
          setSplits([]);
        } finally {
          setDataLoading(false);
        }
      };
      fetchData();
    } else if (!user && (currentView === 'dashboard' || currentView === 'insights')) {
      setRuns([]);
      setSplits([]);
      setCurrentView('welcome');
    }
  }, [user, user?.id, currentView]);

  // Loading view
  if (currentView === 'loading' || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Callback view for Strava authentication
  if (currentView === 'callback') {
    return <SimpleStravaCallback onSuccess={login} />;
  }

  // Welcome view for logged-out users
  if (currentView === 'welcome' || !user) {
    return <Welcome />;
  }

  // --- User is authenticated beyond this point ---

  // Function to handle logout, ensuring view is reset
  const handleLogout = () => {
    logout(); // From useSimpleAuth
    setRuns([]);
    setSplits([]);
    setCurrentView('welcome');
  };

  // Render main application structure for logged-in users
  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar
        currentView={currentView}
        onNavigate={(viewName) => setCurrentView(viewName as View)}
      />
      {/*
        The NavigationBar now also includes the app title "RunSight".
        The user info and logout button are not part of NavigationBar.tsx yet.
        For now, let's keep the logout button accessible. We can integrate it better later.
        A temporary logout button can be added here or we modify SimpleDashboard/InsightsPage
        to no longer show their own headers if NavigationBar is present.
        Let's assume for now the old headers in SimpleDashboard/InsightsPage will be removed in the next step.
        We might need a user display and logout button in the NavigationBar itself or as a separate UserMenu component.
        For this step, the primary goal is integrating the main navigation links.
      */}
      <div className="absolute top-4 right-4 z-50"> {/* Temporary placement for logout */}
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
        <SimpleDashboard
          user={user}
          onLogout={handleLogout} // Prop still needed if dashboard has its own logout
          runs={runs}
          splits={splits}
          isLoading={dataLoading}
          error={dataError}
          // onNavigateToInsights prop will be removed in the next step
          onNavigateToInsights={() => setCurrentView('insights')}
        />
      )}
      {currentView === 'insights' && (
        <InsightsPage
          user={user}
          runs={runs}
          isLoading={dataLoading}
          error={dataError}
          // onNavigateToDashboard prop will be removed in the next step
          onNavigateToDashboard={() => setCurrentView('dashboard')}
        />
      )}
      {/* Placeholder for future views like 'goals' or 'settings' if they have full pages */}
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

export default App;