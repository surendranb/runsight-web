import React, { useEffect, useState } from 'react';
import { Welcome } from './components/Welcome';
import { Dashboard } from './components/Dashboard';
import { StravaCallback } from './components/StravaCallback';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, loading, login, logout } = useAuth();
  const [isCallback, setIsCallback] = useState(false);

  useEffect(() => {
    // Check if this is a callback from Strava
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const isCallbackUrl = window.location.pathname === '/callback' || code;
    
    setIsCallback(isCallbackUrl);
  }, []);

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
    return <StravaCallback onLoginSuccess={login} />;
  }

  if (user) {
    return <Dashboard user={user} onLogout={logout} />;
  }

  return <Welcome />;
}

export default App;