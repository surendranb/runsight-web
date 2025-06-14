// src/components/SimpleDashboard.tsx
import React, { useState, useEffect } from 'react'; // Added useEffect
import { Activity, MapPin, Clock, Zap, Heart } from 'lucide-react';
import { User, EnrichedRun } from '../types'; // RunSplit removed as it's not used

interface SimpleDashboardProps {
  user: User;
  onLogout: () => void;
  runs: EnrichedRun[];
  // splits prop removed as it's not used
  isLoading: boolean;
  error: string | null;
}

export const SimpleDashboard: React.FC<SimpleDashboardProps> = ({
  user,
  onLogout,
  runs,
  isLoading,
  error
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // State variables for filters
  const [gpsFilter, setGpsFilter] = useState<'all' | 'has_gps' | 'no_gps'>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [distanceFilter, setDistanceFilter] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [nameFilter, setNameFilter] = useState<string>('');
  const [filteredRuns, setFilteredRuns] = useState<EnrichedRun[]>(runs);

  // Filtering logic
  useEffect(() => {
    let tempFilteredRuns = [...runs];

    // Apply GPS Filter
    if (gpsFilter === 'has_gps') {
      tempFilteredRuns = tempFilteredRuns.filter(run => run.start_latlng !== null && run.start_latlng !== undefined && run.start_latlng.trim() !== "");
      // Check for null, undefined, and also handle empty string just in case, though null is expected for no GPS.
    } else if (gpsFilter === 'no_gps') {
      tempFilteredRuns = tempFilteredRuns.filter(run => run.start_latlng === null || run.start_latlng === undefined || run.start_latlng.trim() === "");
    }

    if (dateRangeFilter.start) {
      tempFilteredRuns = tempFilteredRuns.filter(run => {
        const runDate = run.start_date_local.substring(0, 10);
        return runDate >= dateRangeFilter.start;
      });
    }
    if (dateRangeFilter.end) {
      tempFilteredRuns = tempFilteredRuns.filter(run => {
        const runDate = run.start_date_local.substring(0, 10);
        return runDate <= dateRangeFilter.end;
      });
    }

    const minDistanceMeters = distanceFilter.min ? parseFloat(distanceFilter.min) * 1000 : null;
    const maxDistanceMeters = distanceFilter.max ? parseFloat(distanceFilter.max) * 1000 : null;
    if (minDistanceMeters !== null && !isNaN(minDistanceMeters)) {
      tempFilteredRuns = tempFilteredRuns.filter(run => run.distance >= minDistanceMeters);
    }
    if (maxDistanceMeters !== null && !isNaN(maxDistanceMeters)) {
      tempFilteredRuns = tempFilteredRuns.filter(run => run.distance <= maxDistanceMeters);
    }

    if (nameFilter.trim() !== '') {
      tempFilteredRuns = tempFilteredRuns.filter(run =>
        run.name.toLowerCase().includes(nameFilter.trim().toLowerCase())
      );
    }

    setFilteredRuns(tempFilteredRuns);
    setCurrentPage(1); // Reset to first page when filters change
  }, [runs, gpsFilter, dateRangeFilter, distanceFilter, nameFilter]);

  const totalPages = Math.ceil(filteredRuns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRuns = filteredRuns.slice(startIndex, endIndex);

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1)); // Ensure totalPages is at least 1
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const resetFilters = () => {
    setGpsFilter('all');
    setDateRangeFilter({ start: '', end: '' });
    setDistanceFilter({ min: '', max: '' });
    setNameFilter('');
  };

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
  const formatDate = (dateString: string) => {
    // Extract YYYY-MM-DD from the ISO string (e.g., "2025-06-10T23:58:00Z" -> "2025-06-10")
    // This assumes dateString is a valid ISO string or at least starts with YYYY-MM-DD.
    const datePart = dateString.substring(0, 10);

    // Create a Date object by appending T00:00:00Z to the date part.
    // This forces the Date object to be interpreted as midnight UTC on that specific date.
    const utcDate = new Date(datePart + 'T00:00:00Z');

    // Format this date using toLocaleDateString, specifying UTC as the timezone.
    // This ensures the output date is based on the UTC interpretation, not the browser's local timezone.
    return utcDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC' // Key change: format the date as it is in UTC.
    });
  };

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
    <div> {/* Added this wrapper div */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome message can be part of the page content if desired */}
        <div className="mb-6 p-4 bg-white shadow rounded-lg">
          <h2 className="text-xl font-semibold text-gray-700">
            Dashboard Overview for {user.name}
          </h2>
        </div>

        {/* Filter UI Elements */}
        <div className="mb-8 p-4 bg-white shadow rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Filter Runs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label htmlFor="nameFilter" className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                id="nameFilter"
                placeholder="Search by name..."
                value={nameFilter}
                onChange={e => setNameFilter(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="gpsFilter" className="block text-sm font-medium text-gray-700">GPS Status</label>
              <select
                id="gpsFilter"
                value={gpsFilter}
                onChange={e => setGpsFilter(e.target.value as 'all' | 'has_gps' | 'no_gps')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All GPS Status</option>
                <option value="has_gps">Has GPS Data</option>
                <option value="no_gps">No GPS Data</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="minDistance" className="block text-sm font-medium text-gray-700">Min Dist (km)</label>
                <input
                  type="number"
                  id="minDistance"
                  placeholder="Min km"
                  value={distanceFilter.min}
                  onChange={e => setDistanceFilter(prev => ({ ...prev, min: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="maxDistance" className="block text-sm font-medium text-gray-700">Max Dist (km)</label>
                <input
                  type="number"
                  id="maxDistance"
                  placeholder="Max km"
                  value={distanceFilter.max}
                  onChange={e => setDistanceFilter(prev => ({ ...prev, max: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  id="startDate"
                  value={dateRangeFilter.start}
                  onChange={e => setDateRangeFilter(prev => ({ ...prev, start: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  id="endDate"
                  value={dateRangeFilter.end}
                  onChange={e => setDateRangeFilter(prev => ({ ...prev, end: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="md:col-span-2 lg:col-span-4 flex justify-end">
                <button
                    onClick={resetFilters}
                    className="mt-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                    Reset Filters
                </button>
            </div>
          </div>
        </div>

      {runs.length === 0 ? ( // Still check original runs prop for "No runs found at all" message
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No runs synced yet</h2>
          <p className="text-gray-600">
            Once you've recorded some runs and they're synced, they will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Stats - now calculated from filteredRuns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full mr-4">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Runs (Filtered)</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredRuns.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-full mr-4">
                    <MapPin className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Distance (Filtered)</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatDistance(filteredRuns.reduce((sum, run) => sum + run.distance, 0))}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-100 rounded-full mr-4">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Time (Filtered)</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatTime(filteredRuns.reduce((sum, run) => sum + run.moving_time, 0))}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-full mr-4">
                    <Zap className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Avg Pace (Filtered)</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {filteredRuns.length > 0 ? formatPace(
                        filteredRuns.reduce((sum, run) => sum + run.distance, 0),
                        filteredRuns.reduce((sum, run) => sum + run.moving_time, 0)
                      ) : '0:00/km'}
                    </p>
                  </div>
                </div>
              </div>
          </div>

          {/* Runs List - now iterates over paginatedRuns derived from filteredRuns */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">Filtered Runs</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {paginatedRuns.length > 0 ? paginatedRuns.map((run) => {
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
              }) : (
                 <div className="p-6 text-center text-gray-500">No runs match the current filters.</div>
              )}
            </div>
          </div>
          {/* Pagination controls - ensure they work with filteredRuns */}
          {filteredRuns.length > itemsPerPage && (
            <div className="mt-8 flex justify-between items-center p-4 bg-white shadow rounded-lg">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
      </main>
    </div> // Closing the added wrapper div
  );
};