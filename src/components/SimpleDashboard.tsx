// src/components/SimpleDashboard.tsx
import React from 'react';
import { Activity, MapPin, Clock, Zap, Heart } from 'lucide-react'; // LogOut removed as logout is global
import { User, EnrichedRun, RunSplit } from '../types';

interface SimpleDashboardProps {
  user: User; // Still needed for "Welcome" message context if any, or can be removed if not used
  onLogout: () => void; // Kept for now if any part of dashboard still calls it, though global logout is primary
  runs: EnrichedRun[];
  splits: RunSplit[];
  isLoading: boolean;
  error: string | null;
  // onNavigateToInsights prop is removed
}

export const SimpleDashboard: React.FC<SimpleDashboardProps> = ({
  user,
  onLogout, // Keep if used by a specific dashboard element, otherwise can be removed if global logout is sole mechanism
  runs,
  splits,
  isLoading,
  error
  // onNavigateToInsights is removed
}) => {
  const formatDistance = (meters: number) => (meters / 1000).toFixed(2) + ' km';
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  const formatPace = (distance: number, time: number) => {
    if (distance === 0 || time === 0) return '0:00/km';
    const paceSeconds = time / (distance / 1000);
    const minutes = Math.floor(paceSeconds / 60);
    const secondsVal = Math.floor(paceSeconds % 60);
    return `${minutes}:${secondsVal.toString().padStart(2, '0')}/km`;
  };
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const getWeatherInfo = (run: EnrichedRun) => {
    if (!run.weather_data || typeof run.weather_data !== 'object') return null;
    const weather = run.weather_data as any;
    return {
      temp: weather.temperature !== undefined ? Math.round(weather.temperature) : null,
      condition: weather.weather?.main || weather.main,
      icon: weather.weather?.icon || weather.icon,
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"> {/* Adjust height for navbar */}
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your runs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4"> {/* Adjust height for navbar */}
        <div className="bg-white p-8 rounded-lg shadow-xl text-center">
          <div className="bg-red-100 p-3 rounded-full inline-block mb-4">
            <Activity className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error Loading Data</h2>
          <p className="text-red-600 mb-3 text-sm">{error}</p>
          <p className="text-xs text-gray-500 mb-4">Please ensure your internet connection is stable and Row Level Security policies for 'runs' table are correctly configured in Supabase.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // The main content of the dashboard, without its own distinct header
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome message can be part of the page content if desired */}
      <div className="mb-6 p-4 bg-white shadow rounded-lg">
        <h2 className="text-xl font-semibold text-gray-700">
          Dashboard Overview for {user.name}
        </h2>
      </div>

      {runs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No runs found</h2>
          <p className="text-gray-600">
            Once you've recorded some runs and they're synced, they will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Stats (structure remains the same) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Runs */}
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full mr-4">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Runs</p>
                  <p className="text-2xl font-bold text-gray-900">{runs.length}</p>
                </div>
              </div>
            </div>
            {/* Total Distance, Total Time, Average Pace cards ... */}
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-full mr-4">
                    <MapPin className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Distance</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatDistance(runs.reduce((sum, run) => sum + run.distance, 0))}
                    </p>
                  </div>
                </div>
              </div>
              {/* Total Time */}
              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-100 rounded-full mr-4">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Time</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatTime(runs.reduce((sum, run) => sum + run.moving_time, 0))}
                    </p>
                  </div>
                </div>
              </div>
              {/* Average Pace */}
              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-full mr-4">
                    <Zap className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Avg Pace</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {runs.length > 0 ? formatPace(
                        runs.reduce((sum, run) => sum + run.distance, 0),
                        runs.reduce((sum, run) => sum + run.moving_time, 0)
                      ) : '0:00/km'}
                    </p>
                  </div>
                </div>
              </div>
          </div>

          {/* Runs List (structure remains the same) */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">Recent Runs</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {runs.map((run) => {
                const weather = getWeatherInfo(run);
                return (
                  <div key={run.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <div className="md:col-span-2">
                        <h3 className="text-lg font-semibold text-blue-700 hover:underline cursor-pointer">{run.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(run.start_date_local)}
                        </p>
                      </div>
                      <div className="text-left md:text-center">
                        <p className="text-sm font-medium text-gray-800">{formatDistance(run.distance)}</p>
                        <p className="text-xs text-gray-500">Distance</p>
                      </div>
                      <div className="text-left md:text-center">
                        <p className="text-sm font-medium text-gray-800">{formatTime(run.moving_time)}</p>
                        <p className="text-xs text-gray-500">Time</p>
                      </div>
                      <div className="text-left md:text-center">
                        <p className="text-sm font-medium text-gray-800">{formatPace(run.distance, run.moving_time)}</p>
                        <p className="text-xs text-gray-500">Pace</p>
                      </div>
                    </div>
                    { (run.average_heartrate || (weather && weather.temp !== null) ) && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center space-x-4 text-xs text-gray-600">
                        {run.average_heartrate && (
                          <div className="flex items-center">
                            <Heart className="w-3 h-3 text-red-500 mr-1" />
                            <span>Avg HR: {Math.round(run.average_heartrate)} bpm</span>
                          </div>
                        )}
                        {weather && weather.temp !== null && (
                          <div className="flex items-center">
                            <span>Temp: {weather.temp}°C ({weather.condition || 'N/A'})</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </main>
  );
};