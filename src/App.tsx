import React from 'react';
import { Welcome } from './components/Welcome';
import { SimpleStravaCallback } from './components/SimpleStravaCallback';
import { SimpleDashboard } from './components/SimpleDashboard';
import { useSimpleAuth } from './hooks/useSimpleAuth';

function App() {
  const { user, loading, login, logout } = useSimpleAuth();

  // Check if this is a callback from Strava
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const isCallback = (window.location.pathname === '/callback' || code) && !user;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isCallback) {
    return <SimpleStravaCallback onSuccess={login} />;
  }

  if (user) {
    return <SimpleDashboard user={user} onLogout={logout} />;
  }

  return <Welcome />;
}

export default App;