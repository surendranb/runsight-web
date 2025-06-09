import React, { useEffect, useState } from 'react';
import { Activity, MapPin, Clock, Zap, Heart, LogOut } from 'lucide-react';
import { SimpleUser } from '../lib/simple-auth';
import { getUserRuns, SimpleRun } from '../lib/simple-data';

interface SimpleDashboardProps {
  user: SimpleUser;
  onLogout: () => void;
}

export const SimpleDashboard: React.FC<SimpleDashboardProps> = ({ user, onLogout }) => {
  const [runs, setRuns] = useState<SimpleRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRuns = async () => {
      try {
        const userRuns = await getUserRuns(user.id);
        setRuns(userRuns);
      } catch (error) {
        console.error('Failed to load runs:', error);
        setError(error instanceof Error ? error.message : 'Failed to load runs');
      } finally {
        setLoading(false);
      }
    };

    loadRuns();
  }, [user.id]);

  const formatDistance = (meters: number) => {
    return (meters / 1000).toFixed(2) + ' km';
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (distance: number, time: number) => {
    const paceSeconds = time / (distance / 1000);
    const minutes = Math.floor(paceSeconds / 60);
    const seconds = Math.floor(paceSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getWeatherInfo = (run: SimpleRun) => {
    if (!run.weather_data) return null;
    
    const weather = run.weather_data;
    return {
      temp: Math.round(weather.temperature),
      condition: weather.weather_main,
      icon: weather.weather_icon,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your runs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 p-4 rounded-full w-16 h-16 mx-auto mb-4">
            <Activity className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">RunSight</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user.email.split('@')[0]}
              </span>
              <button
                onClick={onLogout}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {runs.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No runs found</h2>
            <p className="text-gray-600">
              No running activities found in the last 7 days. Go for a run and sync again!
            </p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Activity className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Runs</p>
                    <p className="text-2xl font-bold text-gray-900">{runs.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <MapPin className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Distance</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatDistance(runs.reduce((sum, run) => sum + run.distance, 0))}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Time</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatTime(runs.reduce((sum, run) => sum + run.moving_time, 0))}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Zap className="w-8 h-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Pace</p>
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

            {/* Runs List */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Runs</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {runs.map((run) => {
                  const weather = getWeatherInfo(run);
                  return (
                    <div key={run.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h3 className="text-lg font-medium text-gray-900">{run.name}</h3>
                            {weather && (
                              <div className="ml-4 flex items-center text-sm text-gray-600">
                                <img 
                                  src={`https://openweathermap.org/img/w/${weather.icon}.png`}
                                  alt={weather.condition}
                                  className="w-6 h-6"
                                />
                                <span className="ml-1">{weather.temp}°C</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatDate(run.start_date)}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-6 text-sm">
                          <div className="text-center">
                            <p className="font-medium text-gray-900">{formatDistance(run.distance)}</p>
                            <p className="text-gray-600">Distance</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-900">{formatTime(run.moving_time)}</p>
                            <p className="text-gray-600">Time</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-900">{formatPace(run.distance, run.moving_time)}</p>
                            <p className="text-gray-600">Pace</p>
                          </div>
                          {run.strava_data?.average_heartrate && (
                            <div className="text-center">
                              <p className="font-medium text-gray-900 flex items-center">
                                <Heart className="w-4 h-4 text-red-500 mr-1" />
                                {Math.round(run.strava_data.average_heartrate)}
                              </p>
                              <p className="text-gray-600">Avg HR</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};