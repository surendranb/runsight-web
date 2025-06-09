import { useState, useEffect } from 'react';
import { SimpleUser, getCurrentUser, signOut } from '../lib/simple-auth';

export const useSimpleAuth = () => {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = (userData: SimpleUser) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  return { user, loading, login, logout };
};