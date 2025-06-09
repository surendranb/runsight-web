import React, { useEffect, useState } from 'react';
import { Welcome } from './components/Welcome';
import { Dashboard } from './components/Dashboard';
import { StravaCallback } from './components/StravaCallback';
import { EnvDebug } from './components/EnvDebug';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, loading, login, logout } = useAuth();
  // Removed useState for isCallback

  // Determine if we should show the StravaCallback component dynamically
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  // Only consider it a callback if the path/code indicates AND we don't yet have a user.
  // Once the user is set by the login process, we are no longer in a "callback processing" state.
  const showCallbackComponent = (window.location.pathname === '/callback' || code) && !user;

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

  // Order of checks:
  // 1. If loading, show loader.
  // 2. If it's a callback situation (URL indicates callback AND no user yet), show StravaCallback.
  // 3. If user exists (and not a callback situation anymore), show Dashboard.
  // 4. Otherwise, show Welcome.

  if (showCallbackComponent) {
    return <StravaCallback onLoginSuccess={login} />;
  }

  if (user) {
    return (
      <>
        <Dashboard user={user} onLogout={logout} />
        <EnvDebug />
      </>
    );
  }

  return (
    <>
      <Welcome />
      <EnvDebug />
    </>
  );
}

export default App;