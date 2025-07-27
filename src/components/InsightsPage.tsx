// src/components/InsightsPage.tsx
import React, { useMemo, useState } from 'react';
import { User, EnrichedRun } from '../types';
import { ConsistencyInsight } from './insights/ConsistencyInsight';
import { PerformanceWeatherInsight } from './insights/PerformanceWeatherInsight';
import { TimeOfDayInsight } from './insights/TimeOfDayInsight';
import { ElevationEffortInsight } from './insights/ElevationEffortInsight';
import { WindPerformanceInsight } from './insights/WindPerformanceInsight';
import { WorkoutTypePerformanceInsight } from './insights/WorkoutTypePerformanceInsight';
import { PersonalRecordsInsight } from './insights/PersonalRecordsInsight';
import { LocationIntelligenceInsight } from './insights/LocationIntelligenceInsight';
import { AdvancedPerformanceInsight } from './insights/AdvancedPerformanceInsight';
import { MonthlySummaryTable } from './insights/MonthlySummaryTable';
import { ActionableInsightCard, ActionableInsight } from './insights/ActionableInsightCard';
import { getActionableInsights } from '../lib/insights/actionableInsightsEngine';
import { ProgressiveHelp, HelpIcon } from './common/ContextualHelp';
import { Lightbulb, Filter, SortAsc } from 'lucide-react';

interface InsightsPageProps {
  user: User;
  runs: EnrichedRun[];
  isLoading: boolean;
  error: string | null;
  // onNavigateToDashboard prop is removed
}

export const InsightsPage: React.FC<InsightsPageProps> = ({ user, runs, isLoading, error }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'confidence' | 'category'>('priority');
  
  // Generate actionable insights
  const actionableInsights = useMemo(() => getActionableInsights(runs), [runs]);
  
  // Filter and sort insights
  const filteredInsights = useMemo(() => {
    let filtered = actionableInsights;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(insight => insight.category === selectedCategory);
    }
    
    // Sort insights
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'confidence':
          return b.confidence - a.confidence;
        case 'category':
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [actionableInsights, selectedCategory, sortBy]);
  
  const handleInsightAction = (insightId: string, action: string) => {
    console.log(`Insight ${insightId} action: ${action}`);
    // Here you could track user interactions with insights
  };
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"> {/* Adjust height for navbar */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading Insights Data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center"> {/* Adjust height for navbar */}
        <div className="bg-red-100 p-4 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold text-red-700 mb-2">Error Loading Insights</h2>
          <p className="text-red-600 mb-4">{error}</p>
          {/* Removed Back to Dashboard button, navigation is via NavigationBar */}
        </div>
      </div>
    );
  }

  // Main content of the InsightsPage, without its own distinct header
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <h2 className="text-2xl font-semibold text-gray-800">Insights Hub</h2>
          <HelpIcon 
            content="Insights are automatically generated from your running data to help you understand patterns and improve your training."
            size="md"
          />
        </div>
        <p className="text-gray-600">Welcome, {user.name}! Analyzing {runs.length} runs.</p>
      </div>

      {/* Actionable Insights Section */}
      {actionableInsights.length > 0 && (
        <div className="mb-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-6 h-6 text-yellow-500" />
                <h3 className="text-xl font-semibold text-gray-800">Actionable Insights</h3>
                <HelpIcon 
                  content="These insights are prioritized by importance and actionability to help you make the biggest impact on your running."
                  size="md"
                />
              </div>
              
              {/* Filters and sorting */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="performance">Performance</option>
                    <option value="consistency">Consistency</option>
                    <option value="training">Training</option>
                    <option value="health">Health</option>
                    <option value="achievement">Achievement</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <SortAsc className="w-4 h-4 text-gray-500" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'priority' | 'confidence' | 'category')}
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="priority">Priority</option>
                    <option value="confidence">Confidence</option>
                    <option value="category">Category</option>
                  </select>
                </div>
              </div>
            </div>

            <ProgressiveHelp
              title="Understanding Actionable Insights"
              basicExplanation="Each insight shows a finding from your data, explains what it means, and provides specific recommendations you can act on."
              detailedExplanation="Insights are prioritized by their potential impact on your running and how confident we are in the data. High-priority insights with high confidence should be your focus."
              examples={[
                "Performance insights help you run faster or more efficiently",
                "Consistency insights help you build better training habits",
                "Health insights help you avoid injury and recover better"
              ]}
              className="mb-6"
            />

            {/* Insights grid */}
            <div className="space-y-6">
              {filteredInsights.map((insight) => (
                <ActionableInsightCard
                  key={insight.id}
                  insight={insight}
                  onAction={handleInsightAction}
                />
              ))}
            </div>

            {filteredInsights.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No insights match your current filters.</p>
                <p className="text-sm">Try adjusting your category or sort options.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <MonthlySummaryTable runs={runs} />

      {runs.length === 0 && !isLoading && (
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
          <PersonalRecordsInsight runs={runs} />
          <ConsistencyInsight runs={runs} />
          <LocationIntelligenceInsight runs={runs} />
          <AdvancedPerformanceInsight runs={runs} />
          <PerformanceWeatherInsight runs={runs} />
          <TimeOfDayInsight runs={runs} />
          <ElevationEffortInsight runs={runs} />
          <WindPerformanceInsight runs={runs} />
          <WorkoutTypePerformanceInsight runs={runs} />
        </div>
      )}
    </main>
  );
};
