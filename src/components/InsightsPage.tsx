// src/components/InsightsPage.tsx
import React from 'react';
import { User, EnrichedRun } from '../types';
import { ConsistencyInsight } from './insights/ConsistencyInsight';
import { PerformanceWeatherInsight } from './insights/PerformanceWeatherInsight';
import { TimeOfDayInsight } from './insights/TimeOfDayInsight';
import { ElevationEffortInsight } from './insights/ElevationEffortInsight';
import { WindPerformanceInsight } from './insights/WindPerformanceInsight';
import { WorkoutTypePerformanceInsight } from './insights/WorkoutTypePerformanceInsight'; // New Import

interface InsightsPageProps {
  user: User;
  runs: EnrichedRun[];
  isLoading: boolean;
  error: string | null;
  onNavigateToDashboard: () => void;
}

export const InsightsPage: React.FC<InsightsPageProps> = ({ user, runs, isLoading, error, onNavigateToDashboard }) => {
  // ... (isLoading and error handling as before) ...
 if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading Insights Data...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="bg-red-100 p-4 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold text-red-700 mb-2">Error Loading Insights</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={onNavigateToDashboard}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ... Header ... */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-gray-900">Running Insights</h1>
            <button
              onClick={onNavigateToDashboard}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-2 rounded-md hover:bg-blue-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-1">Insights Hub</h2>
          <p className="text-gray-600">Welcome, {user.first_name || user.email.split('@')[0]}! Analyzing {runs.length} runs.</p>
        </div>

        {runs.length === 0 && !isLoading && (
         /* ... no run data JSX ... */
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No Run Data</h3>
            <p className="mt-1 text-sm text-gray-500">
              Run data is needed to generate insights.
            </p>
          </div>
        )}

        {runs.length > 0 && (
          <div className="space-y-6">
            <ConsistencyInsight runs={runs} />
            <PerformanceWeatherInsight runs={runs} />
            <TimeOfDayInsight runs={runs} />
            <ElevationEffortInsight runs={runs} />
            <WindPerformanceInsight runs={runs} />
            <WorkoutTypePerformanceInsight runs={runs} /> {/* New component added */}
          </div>
        )}
      </main>
    </div>
  );
};
