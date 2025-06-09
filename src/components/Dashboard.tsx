import React from 'react';
import { User, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase'; // Adjusted path
// import { fetchWeatherData, saveWeatherToDatabase } from '../lib/weather'; // Removed as per request
import { StatCard } from './StatCard';
import { ActivityList } from './ActivityList';
import { ActivityChart } from './ActivityChart';
import { useActivities } from '../hooks/useActivities';
import { User as UserType } from '../types';
import { MapPin, Clock, Zap, TrendingUp, Heart, Mountain } from 'lucide-react';

interface DashboardProps {
  user: UserType;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const { activities, stats, loading } = useActivities(user.id);

  // const handleTestWeatherBackfill = async () => { ... removed ... };

  const formatDistance = (distance: number) => {
    return (distance / 1000).toFixed(0) + ' km';
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    return hours + 'h';
  };

  const formatPace = (pace: number) => {
    const minutes = Math.floor(pace);
    const seconds = Math.floor((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your running data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Running Analytics</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <img
                  src={user.profile_medium}
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm font-medium text-gray-700">
                  {user.first_name} {user.last_name}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {stats ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
              <StatCard
                title="Total Runs"
                value={stats.totalRuns.toString()}
                icon={Activity}
                color="bg-gradient-to-br from-blue-500 to-blue-600"
              />
              <StatCard
                title="Total Distance"
                value={formatDistance(stats.totalDistance)}
                icon={MapPin}
                color="bg-gradient-to-br from-green-500 to-green-600"
              />
              <StatCard
                title="Total Time"
                value={formatTime(stats.totalTime)}
                icon={Clock}
                color="bg-gradient-to-br from-orange-500 to-orange-600"
              />
              <StatCard
                title="Average Pace"
                value={formatPace(stats.averagePace)}
                icon={Zap}
                color="bg-gradient-to-br from-purple-500 to-purple-600"
              />
              <StatCard
                title="Total Elevation"
                value={Math.round(stats.totalElevation) + 'm'}
                icon={Mountain}
                color="bg-gradient-to-br from-indigo-500 to-indigo-600"
              />
              {stats.averageHeartRate > 0 && (
                <StatCard
                  title="Avg Heart Rate"
                  value={Math.round(stats.averageHeartRate) + ' bpm'}
                  icon={Heart}
                  color="bg-gradient-to-br from-red-500 to-red-600"
                />
              )}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <ActivityChart activities={activities} />
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                    <div>
                      <p className="font-medium text-blue-900">Longest Run</p>
                      <p className="text-sm text-blue-700">{formatDistance(stats.bestDistance)}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                    <div>
                      <p className="font-medium text-green-900">Best Pace</p>
                      <p className="text-sm text-green-700">{formatPace(stats.bestPace)}</p>
                    </div>
                    <Zap className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl">
                    <div>
                      <p className="font-medium text-orange-900">Longest Time</p>
                      <p className="text-sm text-orange-700">{formatTime(stats.bestTime)}</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Activity List */}
            <ActivityList activities={activities} />
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No running data found</h3>
            <p className="text-gray-600 mb-6">
              We couldn't find any running activities in your Strava account. 
              Start running and sync your activities to see beautiful analytics here!
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Refresh Data
            </button>
          </div>
        )}
      </main>
      {/* Test button removed */}
      {/* <button
        onClick={handleTestWeatherBackfill}
        style={{ padding: '10px', margin: '20px', backgroundColor: 'lightblue' }}
      >
        Test Single Weather Backfill for 748a221e-472e-45b5-b828-da722c59e9a2
      </button> */}
    </div>
  );
};