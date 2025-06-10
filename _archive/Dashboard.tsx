import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react'; // Kept for header
import { supabase } from '../lib/supabase';
import { User as UserType } from '../types';

// Define interfaces for the new tables (assuming these might be moved to types/index.ts later)
interface EnrichedRun {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  distance: number;
  moving_time: number;
  // Add other relevant fields as necessary
}

interface RunSplit {
  id: string;
  enriched_run_id: string; // Corrected from run_id
  user_id: string; // Assuming user_id is available for direct querying
  split_number: number;
  distance: number;
  elapsed_time: number;
  // Add other relevant fields as necessary
}

interface DashboardProps {
  user: UserType;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [enrichedRuns, setEnrichedRuns] = useState<EnrichedRun[]>([]);
  const [runSplits, setRunSplits] = useState<RunSplit[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      setLoadingData(true);
      setError(null);
      try {
        // Fetch enriched_runs
        const { data: runsData, error: runsError } = await supabase
          .from('enriched_runs')
          .select('*')
          .eq('user_id', user.id)
          .order('start_date', { ascending: false });

        if (runsError) {
          console.error("Error fetching enriched_runs:", runsError);
          throw new Error(`Failed to fetch enriched runs: ${runsError.message}`);
        }
        setEnrichedRuns(runsData || []);

        // Fetch run_splits
        const { data: splitsData, error: splitsError } = await supabase
          .from('run_splits')
          .select('*')
          .eq('user_id', user.id) // Assumes user_id exists on run_splits
          .order('enriched_run_id', { ascending: true }) // Corrected from run_id
          .order('split_number', { ascending: true });

        if (splitsError) {
          console.error("Error fetching run_splits:", splitsError);
          throw new Error(`Failed to fetch run splits: ${splitsError.message}`);
        }
        setRunSplits(splitsData || []);

      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(err.message || 'An unknown error occurred while fetching data.');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [user?.id]);

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
                {user.profile_medium && (
                  <img
                    src={user.profile_medium}
                    alt="Profile"
                    className="w-8 h-8 rounded-full"
                  />
                )}
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
        {loadingData && (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your new running data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {!loadingData && !error && (
          <>
            <div className="mb-8 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Enriched Runs</h2>
              {enrichedRuns.length === 0 ? (
                <p className="text-gray-600">No enriched runs found for this user.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distance (m)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Moving Time (s)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {enrichedRuns.map(run => (
                        <tr key={run.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{run.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(run.start_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{run.distance}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{run.moving_time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Run Splits</h2>
              {runSplits.length === 0 ? (
                <p className="text-gray-600">No run splits found for this user.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Run ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Split #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distance (m)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time (s)</th>
                        {/* Add more headers if needed, e.g., Avg Speed, Avg Heartrate */}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {runSplits.map(split => (
                        <tr key={split.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                            {/* Ensure enriched_run_id is not null or undefined before calling substring */}
                            {split.enriched_run_id ? split.enriched_run_id.substring(0,8) + '...' : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{split.split_number}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{split.distance}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{split.elapsed_time}</td>
                          {/* Add more cells if needed */}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};