// src/App.tsx
import React, { useState, useEffect } from 'react';
import { Welcome } from './components/Welcome';
import { SimpleStravaCallback } from './components/SimpleStravaCallback';
import { SimpleDashboard } from './components/SimpleDashboard';
import { InsightsPage } from './components/InsightsPage';
import { useSimpleAuth } from './hooks/useSimpleAuth'; // This should provide the User type from types/index.ts
import { supabase } from './lib/supabase';
import { EnrichedRun, RunSplit, User } from './types'; // Use User from types/index.ts

type View = 'dashboard' | 'insights' | 'welcome' | 'callback' | 'loading';

function App() {
  const { user, loading: authLoading, login, logout } = useSimpleAuth(); // user should be of Type User
  const [currentView, setCurrentView] = useState<View>('loading');

  const [runs, setRuns] = useState<EnrichedRun[]>([]);
  const [splits, setSplits] = useState<RunSplit[]>([]); // Assuming splits are needed
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const isCallbackRoute = (window.location.pathname === '/callback' || code);

    if (authLoading) {
      setCurrentView('loading');
    } else if (isCallbackRoute && !user) {
      setCurrentView('callback');
    } else if (user) {
      // If user exists, attempt to fetch data and default to dashboard
      // Data fetching will be triggered by the other useEffect based on 'user'
      setCurrentView('dashboard');
    } else {
      setCurrentView('welcome');
    }
  }, [authLoading, user]);

  useEffect(() => {
    // Fetch data if we have a user and are in a view that needs data
    if (user && (currentView === 'dashboard' || currentView === 'insights')) {
      const fetchData = async () => {
        if (!user.id) { // Ensure user.id is available
          setDataError("User ID is missing, cannot fetch data.");
          setDataLoading(false);
          return;
        }
        setDataLoading(true);
        setDataError(null);
        try {
          // Corrected table name to 'runs' as per user's sample data and common use.
          // The sample data row was from the 'runs' table.
          const { data: runsData, error: runsError } = await supabase
            .from('runs') // Assuming 'runs' is the table name for EnrichedRun data
            .select('*')
            .eq('user_id', user.id) // user.id should be the Supabase auth user ID
            .order('start_date', { ascending: false });

          if (runsError) throw runsError;
          setRuns(runsData || []);

          // Assuming 'run_splits' table and its necessity
          // If not needed for insights immediately, this can be conditionally fetched
          const { data: splitsData, error: splitsError } = await supabase
            .from('run_splits')
            .select('*')
            .eq('user_id', user.id)
            .order('enriched_run_id', { ascending: true })
            .order('split_number', { ascending: true });

          if (splitsError) throw splitsError; // Or handle more gracefully if splits are optional
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
      // If somehow user gets nullified while in these views, clear data and redirect
      setRuns([]);
      setSplits([]);
      setCurrentView('welcome');
    }
  }, [user, user?.id, currentView]); // Added user.id to dependency array

  if (currentView === 'loading' || authLoading) { // Check authLoading as well
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (currentView === 'callback') {
    return <SimpleStravaCallback onSuccess={login} />;
  }

  if (currentView === 'welcome' || !user) {
    return <Welcome />;
  }

  // User is authenticated from here
  if (currentView === 'dashboard') {
    return (
      <SimpleDashboard
        user={user}
        onLogout={() => { logout(); setRuns([]); setSplits([]); setCurrentView('welcome'); }}
        runs={runs}
        splits={splits} // Pass splits if your dashboard uses them
        isLoading={dataLoading}
        error={dataError}
        onNavigateToInsights={() => setCurrentView('insights')}
      />
    );
  }

  if (currentView === 'insights') {
    return (
      <InsightsPage
        user={user}
        runs={runs}
        isLoading={dataLoading}
        error={dataError}
        onNavigateToDashboard={() => setCurrentView('dashboard')}
      />
    );
  }

  return <Welcome />; // Fallback
}

export default App;