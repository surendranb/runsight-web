// Secure Authentication Hook - Integrates Supabase Auth
import { useState, useEffect, useCallback } from 'react';
import { apiClient, type User } from '../lib/secure-api-client';
import { createClient, Session } from '@supabase/supabase-js'; // Import createClient and Session

// Initialize Supabase client - ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are in .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing. Check your .env file.");
  // Optionally throw an error or handle this state more gracefully
}
// Initialize a local Supabase client instance.
// Consider exporting a single instance from a dedicated lib file for consistency.
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AuthState {
  user: User | null; // This is our custom 'User' profile from 'runsight_user'
  isLoading: boolean;
  error: string | null;
  session: Session | null; // Supabase session
}

export const useSecureAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
    session: null, // Initialize session
  });

  const updateLocalUserFromSession = useCallback((currentSession: Session | null) => {
    if (currentSession?.user) {
      const storedUser = localStorage.getItem('runsight_user');
      if (storedUser) {
        try {
          const parsedUser: User = JSON.parse(storedUser);
          if (parsedUser.id === currentSession.user.id) {
            setAuthState(prev => ({ ...prev, user: parsedUser, isLoading: false, error: null }));
          } else {
            // Mismatch, clear storedUser as it's not for the current Supabase session
            localStorage.removeItem('runsight_user');
            setAuthState(prev => ({ ...prev, user: null, isLoading: false, error: "User profile mismatch. Please re-authenticate if issues persist." }));
          }
        } catch (e) {
          localStorage.removeItem('runsight_user');
          setAuthState(prev => ({ ...prev, user: null, isLoading: false, error: "Failed to parse user profile." }));
        }
      } else {
        // No local 'runsight_user' but there is a Supabase session.
        // This state implies user is authenticated with Supabase but profile setup might be pending or failed.
        setAuthState(prev => ({ ...prev, user: null, isLoading: false, error: null }));
      }
    } else {
      // No Supabase session, so no 'runsight_user' should exist or be used.
      localStorage.removeItem('runsight_user');
      setAuthState(prev => ({ ...prev, user: null, isLoading: false, error: null }));
    }
  }, []);

  useEffect(() => {
    const fetchInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting initial session:", error);
        setAuthState(prev => ({ ...prev, isLoading: false, error: "Failed to load session." }));
        return;
      }
      setAuthState(prev => ({ ...prev, session: session, isLoading: !session })); // Still loading if no session, to allow onAuthStateChange to pick up
      updateLocalUserFromSession(session);
      // If session is null, isLoading should become false via updateLocalUserFromSession's final setAuthState
      if (!session) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session);
      setAuthState(prev => ({ ...prev, session: session, isLoading: true })); // Set loading true while we process
      updateLocalUserFromSession(session);
       // updateLocalUserFromSession will set isLoading to false
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [updateLocalUserFromSession]);


  const initiateStravaAuth = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const authUrl = await apiClient.getStravaAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Auth initiation failed:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed during initiation'
      }));
    }
  };

  const handleStravaCallback = useCallback(async (code: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // The authenticateWithStrava function in secure-api-client calls a Netlify function
      // which should handle Supabase user creation/linking and session generation.
      const { user } = await apiClient.authenticateWithStrava(code);
      localStorage.setItem('runsight_user', JSON.stringify(user)); // Store our custom user profile

      // After our backend confirms Strava auth and (potentially) interacts with Supabase admin client,
      // the Supabase client (here) needs to be aware of any session changes.
      await supabase.auth.refreshSession(); // Crucial to sync Supabase client session
      const { data: { session: newSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error refreshing session after Strava callback:", sessionError);
        // Fallback to previous state or error state
        setAuthState(prev => ({ ...prev, isLoading: false, error: "Failed to sync session." }));
        return; // Or throw
      }
      
      // Now that Supabase client session is updated, onAuthStateChange should theoretically trigger.
      // However, to be explicit:
      setAuthState(prev => ({
        ...prev,
        user, // Our custom user object
        session: newSession, // The new Supabase session
        isLoading: false,
        error: null
      }));
      return user;
    } catch (error) {
      console.error('Callback handling failed:', error);
      localStorage.removeItem('runsight_user');
      setAuthState(prev => ({
        ...prev,
        user: null,
        session: null, // Clear session on error
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed during callback'
      }));
      throw error;
    }
  }, []);

  const logout = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    const { error } = await supabase.auth.signOut(); // Sign out from Supabase
    if (error) {
        console.error("Error logging out from Supabase:", error);
        // Proceed to clear local state anyway, but perhaps show error
    }
    localStorage.removeItem('runsight_user'); // Clear our custom user profile
    setAuthState({ // Reset state completely
      user: null,
      isLoading: false,
      error: error ? "Logout failed." : null,
      session: null,
    });
  };

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session token for access token:', error);
      return null;
    }
    return data.session?.access_token || null;
  }, []);

  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  return {
    user: authState.user,
    isLoading: authState.isLoading,
    error: authState.error,
    session: authState.session, // Expose session
    // User is authenticated if Supabase has a session AND our specific 'runsight_user' profile is loaded.
    // This definition might need adjustment based on how strictly 'runsight_user' presence is enforced.
    isAuthenticated: !!authState.session?.user && !!authState.user,
    initiateStravaAuth,
    handleStravaCallback,
    logout,
    clearError,
    getAccessToken, // Expose new function
  };
};