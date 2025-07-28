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
import { InsightSummaryCard } from './insights/InsightSummaryCard';
import { 
  getActionableInsights, 
  getPrioritizedInsights, 
  getMostImportantInsights,
  getInsightCategories,
  InsightFilter 
} from '../lib/insights/actionableInsightsEngine';
import { ProgressiveHelp, HelpIcon } from './common/ContextualHelp';
import { Heading, Section, EmphasisBox, visualHierarchy } from './common/VisualHierarchy';
import { ErrorDisplay, useErrorTranslation } from './common/ErrorDisplay';
import { Lightbulb, ChevronLeft, ChevronRight, Grid3X3, List, FileText, BarChart3 } from 'lucide-react';

interface InsightsPageProps {
  user: User;
  runs: EnrichedRun[];
  isLoading: boolean;
  error: string | null;
  // onNavigateToDashboard prop is removed
}

export const InsightsPage: React.FC<InsightsPageProps> = ({ user, runs, isLoading, error }) => {
  const [viewMode, setViewMode] = useState<'most-important' | 'all' | 'filtered'>('most-important');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [onlyActionable, setOnlyActionable] = useState<boolean>(false);
  const [minConfidence, setMinConfidence] = useState<number>(0.6);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [displayMode, setDisplayMode] = useState<'cards' | 'summary' | 'grouped'>('summary');
  
  // Cognitive load optimization: max 7 insights per page
  const INSIGHTS_PER_PAGE = 7;
  
  // Get insight categories for filtering
  const insightCategories = useMemo(() => getInsightCategories(), []);
  
  // Generate all insights based on view mode
  const allInsights = useMemo(() => {
    if (viewMode === 'most-important') {
      return getMostImportantInsights(runs);
    }
    
    if (viewMode === 'all') {
      return getActionableInsights(runs);
    }
    
    // Filtered view
    const filter: InsightFilter = {
      categories: selectedCategory !== 'all' ? [selectedCategory] : undefined,
      priorities: selectedPriority !== 'all' ? [selectedPriority] : undefined,
      onlyActionable: onlyActionable || undefined,
      minConfidence: minConfidence
    };
    
    return getPrioritizedInsights(runs, filter);
  }, [runs, viewMode, selectedCategory, selectedPriority, onlyActionable, minConfidence]);

  // Pagination logic - following 7±2 rule
  const totalPages = Math.ceil(allInsights.length / INSIGHTS_PER_PAGE);
  const startIndex = (currentPage - 1) * INSIGHTS_PER_PAGE;
  const endIndex = startIndex + INSIGHTS_PER_PAGE;
  const displayedInsights = allInsights.slice(startIndex, endIndex);

  // Group insights by category for grouped view
  const groupedInsights = useMemo(() => {
    const groups = displayedInsights.reduce((acc, insight) => {
      if (!acc[insight.category]) {
        acc[insight.category] = [];
      }
      acc[insight.category].push(insight);
      return acc;
    }, {} as Record<string, typeof displayedInsights>);
    
    return groups;
  }, [displayedInsights]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [viewMode, selectedCategory, selectedPriority, onlyActionable, minConfidence]);
  
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

  // Use error translation hook
  const { translateError } = useErrorTranslation();

  if (error) {
    const translatedError = translateError(error, 'Insights loading failed');
    
    // Add insights-specific recovery options
    const errorWithRecovery = {
      ...translatedError,
      recoveryOptions: [
        {
          label: 'Retry Loading',
          description: 'Try loading the insights again',
          action: () => window.location.reload(),
          primary: true
        },
        {
          label: 'Go to Dashboard',
          description: 'Return to the main dashboard',
          action: () => {
            // Navigate to dashboard - this would be handled by the parent component
            window.location.hash = '#dashboard';
            window.location.reload();
          }
        },
        ...(translatedError.recoveryOptions || [])
      ]
    };

    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <div className="bg-blue-100 p-3 rounded-full inline-block mb-4">
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Insights Hub
            </h1>
          </div>
          
          <ErrorDisplay 
            error={errorWithRecovery}
            className="shadow-lg"
          />
        </div>
      </div>
    );
  }

  // Main content of the InsightsPage, without its own distinct header
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Section
        title="Insights Hub"
        subtitle={`Welcome, ${user.name}! Analyzing ${runs.length} runs to provide actionable insights for your training.`}
        level={1}
        icon={BarChart3}
        badge={{
          text: `${runs.length} runs`,
          color: 'blue'
        }}
        actions={
          <HelpIcon 
            content="Insights are automatically generated from your running data to help you understand patterns and improve your training."
            size="md"
          />
        }
        background="white"
        className="mb-8"
      />

      {/* Actionable Insights Section */}
      {displayedInsights.length > 0 && (
        <Section
          title="Actionable Insights"
          subtitle="Prioritized by potential impact, confidence, and actionability to help you make the biggest improvements to your running."
          level={2}
          icon={Lightbulb}
          badge={{
            text: `${allInsights.length} total insights`,
            color: 'yellow'
          }}
          actions={
            <HelpIcon 
              content="These insights are prioritized by potential impact, confidence, and actionability to help you make the biggest improvements to your running."
              size="md"
            />
          }
          className="mb-8"
        >
          <div className={visualHierarchy.spacing.md}>

            {/* View Mode and Display Controls */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              {/* View Mode Selector - Fitts's Law compliant */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('most-important')}
                  className={`min-h-[44px] min-w-[44px] px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 select-none md:min-h-[36px] md:min-w-[36px] md:px-3 md:py-2 ${
                    viewMode === 'most-important'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 active:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                  style={{ 
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  <span className="whitespace-nowrap">Most Important</span>
                </button>
                <button
                  onClick={() => setViewMode('all')}
                  className={`min-h-[44px] min-w-[44px] px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 select-none md:min-h-[36px] md:min-w-[36px] md:px-3 md:py-2 ${
                    viewMode === 'all'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 active:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                  style={{ 
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  <span className="whitespace-nowrap">All Insights</span>
                </button>
                <button
                  onClick={() => setViewMode('filtered')}
                  className={`min-h-[44px] min-w-[44px] px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 select-none md:min-h-[36px] md:min-w-[36px] md:px-3 md:py-2 ${
                    viewMode === 'filtered'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 active:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                  style={{ 
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  <span className="whitespace-nowrap">Custom Filter</span>
                </button>
              </div>

              {/* Display Mode Selector - Fitts's Law compliant */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Display:</span>
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setDisplayMode('summary')}
                    className={`min-h-[44px] min-w-[44px] p-3 rounded-md transition-all duration-200 select-none md:min-h-[36px] md:min-w-[36px] md:p-2 ${
                      displayMode === 'summary'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800 active:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                    title="Summary cards with progressive disclosure"
                    style={{ 
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation'
                    }}
                  >
                    <FileText className="w-5 h-5 md:w-4 md:h-4" />
                  </button>
                  <button
                    onClick={() => setDisplayMode('cards')}
                    className={`min-h-[44px] min-w-[44px] p-3 rounded-md transition-all duration-200 select-none md:min-h-[36px] md:min-w-[36px] md:p-2 ${
                      displayMode === 'cards'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800 active:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                    title="Full card view"
                    style={{ 
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation'
                    }}
                  >
                    <Grid3X3 className="w-5 h-5 md:w-4 md:h-4" />
                  </button>
                  <button
                    onClick={() => setDisplayMode('grouped')}
                    className={`min-h-[44px] min-w-[44px] p-3 rounded-md transition-all duration-200 select-none md:min-h-[36px] md:min-w-[36px] md:p-2 ${
                      displayMode === 'grouped'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800 active:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                    title="Grouped by category"
                    style={{ 
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation'
                    }}
                  >
                    <List className="w-5 h-5 md:w-4 md:h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Filtering Options (only show when in filtered mode) */}
            {viewMode === 'filtered' && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full min-h-[44px] text-sm border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all duration-200 cursor-pointer select-none md:min-h-[36px] md:px-3 md:py-2"
                      style={{ 
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation'
                      }}
                    >
                      <option value="all">All Categories</option>
                      {insightCategories.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={selectedPriority}
                      onChange={(e) => setSelectedPriority(e.target.value)}
                      className="w-full min-h-[44px] text-sm border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all duration-200 cursor-pointer select-none md:min-h-[36px] md:px-3 md:py-2"
                      style={{ 
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation'
                      }}
                    >
                      <option value="all">All Priorities</option>
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>

                  {/* Confidence Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Confidence: {(minConfidence * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0.3"
                      max="1"
                      step="0.1"
                      value={minConfidence}
                      onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                      className="w-full h-6 cursor-pointer appearance-none bg-gray-200 rounded-lg outline-none slider-thumb:appearance-none slider-thumb:w-6 slider-thumb:h-6 slider-thumb:bg-blue-600 slider-thumb:rounded-full slider-thumb:cursor-pointer"
                      style={{ 
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation'
                      }}
                    />
                  </div>

                  {/* Actionable Filter */}
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={onlyActionable}
                        onChange={(e) => setOnlyActionable(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                        style={{ 
                          WebkitTapHighlightColor: 'transparent',
                          touchAction: 'manipulation'
                        }}
                      />
                      <span>Only Actionable</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* View Mode Descriptions */}
            <div className="mb-6">
              {viewMode === 'most-important' && (
                <ProgressiveHelp
                  title="Most Important Insights"
                  basicExplanation="These are your top 4 insights, automatically prioritized by potential impact on your running performance."
                  detailedExplanation="Our algorithm considers impact potential, data confidence, actionability, and urgency to surface the insights that matter most for your training. Use summary view for quick scanning or expand individual insights for details."
                  examples={[
                    "High-impact performance improvements you can make immediately",
                    "Health insights that could prevent injury",
                    "Training adjustments with the biggest potential benefit"
                  ]}
                  className="mb-4"
                />
              )}
              
              {viewMode === 'all' && (
                <ProgressiveHelp
                  title="All Available Insights"
                  basicExplanation="Complete list of insights from your running data, automatically prioritized by importance. Maximum 7 insights per page to reduce cognitive load."
                  detailedExplanation="All insights that meet minimum confidence and sample size requirements, sorted by their potential impact on your running. Use pagination to browse through all insights."
                  examples={[
                    "Performance trends and patterns",
                    "Training consistency analysis",
                    "Achievement celebrations and milestones"
                  ]}
                  className="mb-4"
                />
              )}
              
              {viewMode === 'filtered' && (
                <ProgressiveHelp
                  title="Custom Filtered Insights"
                  basicExplanation="Filter insights by category, priority, confidence level, and actionability to focus on what matters to you. Results are paginated to show maximum 7 insights at once."
                  detailedExplanation="Use the filters above to narrow down insights based on your current training focus and preferences. The summary view helps you quickly scan through filtered results."
                  examples={[
                    "Focus on only performance insights for race preparation",
                    "Show only high-confidence insights for reliable guidance",
                    "Filter for actionable insights you can implement immediately"
                  ]}
                  className="mb-4"
                />
              )}
            </div>

            {/* Insights Display */}
            {displayMode === 'summary' ? (
              /* Summary View - Compact cards with progressive disclosure */
              <div className="space-y-4">
                {displayedInsights.map((insight) => (
                  <InsightSummaryCard
                    key={insight.id}
                    insight={insight}
                    onAction={handleInsightAction}
                  />
                ))}
              </div>
            ) : displayMode === 'cards' ? (
              /* Card View - Full detailed cards */
              <div className="space-y-6">
                {displayedInsights.map((insight) => (
                  <ActionableInsightCard
                    key={insight.id}
                    insight={insight}
                    onAction={handleInsightAction}
                  />
                ))}
              </div>
            ) : (
              /* Grouped View - Visual categorization */
              <div className="space-y-8">
                {Object.entries(groupedInsights).map(([category, categoryInsights]) => {
                  const categoryInfo = insightCategories.find(c => c.value === category);
                  return (
                    <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Category Header */}
                      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-800 capitalize">
                              {categoryInfo?.label || category}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {categoryInfo?.description || `Insights related to ${category}`}
                            </p>
                          </div>
                          <div className="text-sm text-gray-500">
                            {categoryInsights.length} insight{categoryInsights.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      
                      {/* Category Insights */}
                      <div className="divide-y divide-gray-200">
                        {categoryInsights.map((insight) => (
                          <div key={insight.id} className="p-6">
                            <ActionableInsightCard
                              insight={insight}
                              onAction={handleInsightAction}
                              className="border-0 shadow-none bg-transparent p-0"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1}-{Math.min(endIndex, allInsights.length)} of {allInsights.length} insights
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          page === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {allInsights.length === 0 && (
              <EmphasisBox
                variant="info"
                title="No Insights Available"
                icon={Lightbulb}
                priority="low"
              >
                <p className="mb-2">No insights match your current criteria.</p>
                <p className="text-sm">
                  {viewMode === 'filtered' 
                    ? 'Try adjusting your filters or switch to "All Insights" view.'
                    : 'More insights will appear as you add more running data.'
                  }
                </p>
              </EmphasisBox>
            )}
          </div>
        </Section>
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
