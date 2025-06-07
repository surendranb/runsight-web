import React from 'react';
import { Activity } from 'lucide-react';
import { getStravaAuthUrl } from '../lib/strava';

interface AuthButtonProps {
  loading?: boolean;
}

export const AuthButton: React.FC<AuthButtonProps> = ({ loading = false }) => {
  const handleLogin = () => {
    window.location.href = getStravaAuthUrl();
  };

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Activity className="w-6 h-6" />
      {loading ? 'Connecting...' : 'Connect with Strava'}
    </button>
  );
};