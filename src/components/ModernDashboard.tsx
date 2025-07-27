import React, { useState, useMemo } from 'react';
import { User, EnrichedRun } from '../types';
import { PrimaryKPISystem } from './dashboard/PrimaryKPISystem';
import { ProgressiveDisclosurePanel } from './dashboard/ProgressiveDisclosurePanel';
import { PaceTrendChart } from './dashboard/PaceTrendChart';
import { ActivityTimeline } from './dashboard/ActivityTimeline';
import { InsightCard } from './dashboard/InsightCard';
import { Activity, MapPin, Clock, Settings, RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { filterOutliers, getOutlierStats } from '../lib/outlierDetection';

interface ModernDashboardProps {
  user: User;
  runs: EnrichedRun[];
  isLoading: boolean;
  error: string | null;
  onSync?: () => void;
  onLogout: () => void;
}

type TimePeriod = 'last30' | 'thisYear' | 'allTime' | 'custom';

export const ModernDashboard: React.FC<ModernDashboardProps> = ({
  user,
  runs,
  isLoading,
  error,
  onSync,
  onLogout
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('last30');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  
  // Progressive disclosure state
  const [selectedMetricForDetails, setSelectedMetricForDetails] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    trends: false,
    activities: false,
    insights: false,
    advanced: false
  });

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Filter runs based on selected period and remove outliers
  const filteredRuns = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let dateFilteredRuns: EnrichedRun[];

    switch (selectedPeriod) {
      case 'last30':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilteredRuns = runs.filter(run => new Date(run.start_date_local) >= startDate);
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        dateFilteredRuns = runs.filter(run => new Date(run.start_date_local) >= startDate);
        break;
      case 'custom':
        if (!customDateRange.start) {
          dateFilteredRuns = runs;
        } else {
          startDate = new Date(customDateRange.start);
          const endDate = customDateRange.end ? new Date(customDateRange.end) : now;
          dateFilteredRuns = runs.filter(run => {
            const runDate = new Date(run.start_date_local);
            return runDate >= startDate && runDate <= endDate;
          });
        }
        break;
      case 'allTime':
      default:
        dateFilteredRuns = runs;
    }

    // Apply outlier filtering to remove GPS errors and unrealistic paces
    const cleanRuns = filterOutliers(dateFilteredRuns);
    
    // Log outlier statistics for debugging
    const outlierStats = getOutlierStats(dateFilteredRuns);
    if (outlierStats.outliers > 0) {
      console.log(`Filtered out ${outlierStats.outliers} outlier runs out of ${outlierStats.total} total runs:`, {
        unrealisticPace: outlierStats.outlierReasons.unrealisticPace,
        unrealisticDistance: outlierStats.outlierReasons.unrealisticDistance,
        unrealisticElevation: outlierStats.outlierReasons.unrealisticElevation
      });
    }

    return cleanRuns;
  }, [runs, selectedPeriod, customDateRange]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    if (filteredRuns.length === 0) {
      return {
        totalRuns: 0,
        totalDistance: 0,
        totalTime: 0,
        avgPace: 0,
        avgPacePrevious: 0,
        paceImprovement: 0
      };
    }

    const totalDistance = filteredRuns.reduce((sum, run) => sum + run.distance, 0);
    const totalTime = filteredRuns.reduce((sum, run) => sum + run.moving_time, 0);
    const avgPace = totalTime / (totalDistance / 1000);

    // Calculate previous period for comparison
    const periodDays = selectedPeriod === 'last30' ? 30 : selectedPeriod === 'thisYear' ? 365 : 90;
    const previousStartDate = new Date(Date.now() - 2 * periodDays * 24 * 60 * 60 * 1000);
    const previousEndDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    
    const previousRuns = runs.filter(run => {
      const runDate = new Date(run.start_date_local);
      return runDate >= previousStartDate && runDate <= previousEndDate;
    });

    let avgPacePrevious = 0;
    if (previousRuns.length > 0) {
      const prevTotalDistance = previousRuns.reduce((sum, run) => sum + run.distance, 0);
      const prevTotalTime = previousRuns.reduce((sum, run) => sum + run.moving_time, 0);
      avgPacePrevious = prevTotalTime / (prevTotalDistance / 1000);
    }

    const paceImprovement = avgPacePrevious > 0 ? (avgPace - avgPacePrevious) / avgPacePrevious : 0;

    return {
      totalRuns: filteredRuns.length,
      totalDistance,
      totalTime,
      avgPace,
      avgPacePrevious,
      paceImprovement
    };
  }, [filteredRuns, runs, selectedPeriod]);

  // Generate insights
  const insights = useMemo(() => {
    if (filteredRuns.length < 5) return [];

    const insights = [];

    // Weather performance insight
    const runsWithWeather = filteredRuns.filter(run => run.weather_data);
    if (runsWithWeather.length >= 10) {
      const coolRuns = runsWithWeather.filter(run => {
        const temp = (run.weather_data as any)?.temperature;
        return temp && temp < 18;
      });
      const warmRuns = runsWithWeather.filter(run => {
        const temp = (run.weather_data as any)?.temperature;
        return temp && temp >= 18;
      });

      if (coolRuns.length >= 3 && warmRuns.length >= 3) {
        const coolAvgPace = coolRuns.reduce((sum, run) => sum + (run.moving_time / (run.distance / 1000)), 0) / coolRuns.length;
        const warmAvgPace = warmRuns.reduce((sum, run) => sum + (run.moving_time / (run.distance / 1000)), 0) / warmRuns.length;
        const improvement = ((warmAvgPace - coolAvgPace) / warmAvgPace) * 100;

        if (Math.abs(improvement) > 5) {
          insights.push({
            icon: 'weather' as const,
            title: 'Weather Impact',
            insight: `You run ${improvement > 0 ? 'faster' : 'slower'} in cooler weather (below 18°C) by ${Math.abs(improvement).toFixed(1)}%`,
            actionable: improvement > 0 ? 'Consider scheduling your key workouts for cooler parts of the day' : 'You perform consistently across different temperatures',
            confidence: Math.min(0.7 + (Math.abs(improvement) / 100), 0.95)
          });
        }
      }
    }

    // Consistency insight
    const recentRuns = filteredRuns.slice(-10);
    if (recentRuns.length >= 5) {
      const paces = recentRuns.map(run => run.moving_time / (run.distance / 1000));
      const avgPace = paces.reduce((sum, pace) => sum + pace, 0) / paces.length;
      const variance = paces.reduce((sum, pace) => sum + Math.pow(pace - avgPace, 2), 0) / paces.length;
      const consistency = 1 - (Math.sqrt(variance) / avgPace);

      if (consistency > 0.85) {
        insights.push({
          icon: 'trend' as const,
          title: 'Consistency',
          insight: `Your pacing has been very consistent lately (${(consistency * 100).toFixed(1)}% consistency score)`,
          actionable: 'Great job maintaining steady effort! Consider gradually increasing your training load.',
          confidence: 0.8
        });
      } else if (consistency < 0.7) {
        insights.push({
          icon: 'trend' as const,
          title: 'Pacing Variability',
          insight: `Your recent runs show high pace variability (${(consistency * 100).toFixed(1)}% consistency)`,
          actionable: 'Focus on maintaining steady effort during runs. Consider using a heart rate monitor or perceived exertion scale.',
          confidence: 0.75
        });
      }
    }

    // Weekly pattern insight
    const runsByDay = filteredRuns.reduce((acc, run) => {
      const day = new Date(run.start_date_local).getDay();
      acc[day] = acc[day] || [];
      acc[day].push(run);
      return acc;
    }, {} as Record<number, EnrichedRun[]>);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const bestDay = Object.entries(runsByDay)
      .filter(([_, runs]) => runs.length >= 3)
      .map(([day, runs]) => ({
        day: parseInt(day),
        avgPace: runs.reduce((sum, run) => sum + (run.moving_time / (run.distance / 1000)), 0) / runs.length,
        count: runs.length
      }))
      .sort((a, b) => a.avgPace - b.avgPace)[0];

    if (bestDay && Object.keys(runsByDay).length >= 3) {
      insights.push({
        icon: 'calendar' as const,
        title: 'Weekly Pattern',
        insight: `You tend to run fastest on ${dayNames[bestDay.day]}s`,
        actionable: `Consider scheduling your key workouts on ${dayNames[bestDay.day]}s when you typically perform best.`,
        confidence: 0.7
      });
    }

    return insights;
  }, [filteredRuns]);

  const formatPace = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters: number) => (meters / 1000).toFixed(0);

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'last30': return 'Last 30 Days';
      case 'thisYear': return 'This Year';
      case 'allTime': return 'All Time';
      case 'custom': return 'Custom Range';
      default: return 'Last 30 Days';
    }
  };

  // Cognitive load helper: Get the most important insight based on confidence and impact
  const getPrimaryInsight = () => {
    if (insights.length === 0) return null;
    
    // Sort by confidence score (highest first) to show most reliable insight
    const sortedInsights = [...insights].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    return sortedInsights[0];
  };

  // Information scent helper: Create descriptive labels
  const getDataFreshnessIndicator = () => {
    if (filteredRuns.length === 0) return 'No data';
    
    const latestRun = filteredRuns.reduce((latest, run) => 
      new Date(run.start_date_local) > new Date(latest.start_date_local) ? run : latest
    );
    
    const daysSinceLastRun = Math.floor(
      (Date.now() - new Date(latestRun.start_date_local).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLastRun === 0) return 'Updated today';
    if (daysSinceLastRun === 1) return 'Updated yesterday';
    if (daysSinceLastRun <= 7) return `Updated ${daysSinceLastRun} days ago`;
    return 'Data may be outdated';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-md">
          <div className="bg-red-100 p-3 rounded-full inline-block mb-4">
            <Activity className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error Loading Dashboard</h2>
          <p className="text-red-600 mb-3 text-sm">{error}</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simplified Header - Information Chunk 1 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Welcome back, {user.name}</h1>
                <p className="text-sm text-gray-600">{getPeriodLabel()} • {metrics.totalRuns} runs • {getDataFreshnessIndicator()}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {onSync && (
                <button
                  onClick={onSync}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Sync
                </button>
              )}
              
              {/* Integrated Period Selector */}
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as TimePeriod)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="last30">Last 30 Days</option>
                <option value="thisYear">This Year</option>
                <option value="allTime">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          </div>
          
          {/* Custom Date Range - Only show when needed */}
          {selectedPeriod === 'custom' && (
            <div className="mt-3 flex items-center space-x-2 justify-end">
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <span className="text-gray-500 text-sm">to</span>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {runs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No runs synced yet</h2>
            <p className="text-gray-600">
              Once you've recorded some runs and they're synced, your dashboard will come to life here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 7±2 Rule Implementation: Maximum 7 primary information chunks */}
            
            {/* Information Chunk 1: Primary KPI System (4 cards grouped as one cognitive unit) */}
            <PrimaryKPISystem
              runs={filteredRuns}
              period={getPeriodLabel()}
              onViewDetails={(metric) => {
                setSelectedMetricForDetails(metric);
              }}
            />

            {/* Information Chunk 2: Performance Trend Visualization (Collapsible) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('trends')}
                className="w-full bg-gray-50 px-6 py-4 border-b border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                      <span>Pace Trend Analysis</span>
                      <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                        {filteredRuns.length} runs analyzed
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600">Interactive chart showing pace improvements, moving averages, and performance patterns</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{getDataFreshnessIndicator()}</p>
                    </div>
                    {expandedSections.trends ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </div>
              </button>
              
              {/* Collapsible content with smooth transition */}
              <div className={`transition-all duration-300 ease-in-out ${expandedSections.trends ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <div className="p-6">
                  <PaceTrendChart
                    data={filteredRuns}
                    period={getPeriodLabel()}
                    showMovingAverage={true}
                    highlightPersonalRecords={true}
                    showWeatherIndicators={true}
                  />
                </div>
              </div>
              
              {/* Preview when collapsed */}
              {!expandedSections.trends && (
                <div className="px-6 py-4 bg-blue-50 border-t border-blue-100">
                  <p className="text-sm text-blue-700 text-center">
                    📈 Interactive pace chart • Moving averages • Personal records • Weather indicators
                  </p>
                </div>
              )}
            </div>

            {/* Information Chunk 3: Recent Activity Summary (Collapsible) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('activities')}
                className="w-full bg-gray-50 px-6 py-4 border-b border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                      <span>Activity Timeline</span>
                      <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                        Last 8 runs
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600">Chronological view of recent runs with weather data, pace, and performance indicators</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Most recent first</p>
                    </div>
                    {expandedSections.activities ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </div>
              </button>
              
              {/* Collapsible content with smooth transition */}
              <div className={`transition-all duration-300 ease-in-out ${expandedSections.activities ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <div className="p-6">
                  <ActivityTimeline
                    activities={filteredRuns.slice().reverse()}
                    limit={8}
                    showWeather={true}
                    colorCodeByPerformance={true}
                  />
                </div>
              </div>
              
              {/* Preview when collapsed */}
              {!expandedSections.activities && (
                <div className="px-6 py-4 bg-green-50 border-t border-green-100">
                  <p className="text-sm text-green-700 text-center">
                    🏃‍♂️ Activity timeline • Weather conditions • Pace analysis • Performance trends
                  </p>
                </div>
              )}
            </div>

            {/* Information Chunk 4: Key Performance Insight (Collapsible) */}
            {getPrimaryInsight() && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSection('insights')}
                  className="w-full p-6 hover:bg-amber-100 hover:bg-opacity-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-left">
                      <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse"></div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">AI-Powered Performance Insight</h3>
                        <p className="text-sm text-amber-700">Most important finding: {getPrimaryInsight()!.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-amber-700 bg-amber-100 px-3 py-1 rounded-full font-medium">
                        {getPrimaryInsight()?.confidence ? `${Math.round(getPrimaryInsight()!.confidence * 100)}% confidence` : 'High priority'}
                      </span>
                      {expandedSections.insights ? (
                        <ChevronUp className="w-5 h-5 text-amber-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                  </div>
                </button>
                
                {/* Collapsible insight content */}
                <div className={`transition-all duration-300 ease-in-out ${expandedSections.insights ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                  <div className="px-6 pb-6">
                    <InsightCard
                      icon={getPrimaryInsight()!.icon}
                      title={getPrimaryInsight()!.title}
                      insight={getPrimaryInsight()!.insight}
                      actionable={getPrimaryInsight()!.actionable}
                      confidence={getPrimaryInsight()!.confidence}
                    />
                    
                    {/* Progressive Disclosure for Additional Insights */}
                    {insights.length > 1 && (
                      <div className="mt-6 pt-4 border-t border-amber-200">
                        <button 
                          onClick={() => toggleSection('advanced')}
                          className="w-full text-center text-sm text-amber-700 hover:text-amber-800 font-medium transition-colors bg-amber-100 hover:bg-amber-200 py-3 px-4 rounded-lg"
                        >
                          View {insights.length - 1} Additional Insights →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Preview when collapsed */}
                {!expandedSections.insights && (
                  <div className="px-6 pb-6">
                    <p className="text-sm text-amber-700 bg-amber-100 bg-opacity-60 rounded-lg p-3 text-center">
                      "{getPrimaryInsight()!.insight.substring(0, 80)}..." - Click to view full insight and recommendations
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Information Chunk 5: Advanced Metrics (Collapsible) */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200 overflow-hidden">
              <button
                onClick={() => toggleSection('advanced')}
                className="w-full p-6 hover:bg-purple-100 hover:bg-opacity-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                        Advanced Analytics
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">Advanced Analytics Hub</h3>
                    <p className="text-sm text-purple-700">Deep-dive analysis: weather impact, training consistency, and performance optimization strategies</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-purple-700 bg-purple-100 px-3 py-1 rounded-full font-medium">
                      {insights.length} insights
                    </span>
                    {expandedSections.advanced ? (
                      <ChevronUp className="w-5 h-5 text-purple-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-purple-600" />
                    )}
                  </div>
                </div>
              </button>
              
              {/* Collapsible advanced content */}
              <div className={`transition-all duration-300 ease-in-out ${expandedSections.advanced ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white bg-opacity-60 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-2">Weather Impact Analysis</h4>
                      <p className="text-sm text-gray-600">
                        Correlation between weather conditions and your performance across {filteredRuns.length} runs
                      </p>
                    </div>
                    <div className="bg-white bg-opacity-60 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-2">Consistency Tracking</h4>
                      <p className="text-sm text-gray-600">
                        Pace variability and training consistency patterns over time
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button className="flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm">
                      <span>View All Insights</span>
                      {insights.length > 0 && (
                        <span className="ml-2 text-xs bg-purple-500 px-2 py-1 rounded-full">
                          {insights.length}
                        </span>
                      )}
                    </button>
                    
                    <button className="flex items-center justify-center px-6 py-3 border-2 border-purple-300 text-purple-700 rounded-lg hover:bg-white hover:shadow-sm transition-all font-medium">
                      <span>Export Data</span>
                      <span className="ml-2 text-purple-500">↗</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Preview when collapsed */}
              {!expandedSections.advanced && (
                <div className="px-6 pb-6">
                  <p className="text-sm text-purple-700 bg-purple-100 bg-opacity-60 rounded-lg p-3 text-center">
                    🌤️ Weather impact analysis • 📊 Consistency tracking • 🎯 Performance optimization • 📈 Advanced metrics
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Progressive Disclosure Panel */}
      <ProgressiveDisclosurePanel
        isOpen={selectedMetricForDetails !== null}
        onClose={() => setSelectedMetricForDetails(null)}
        metric={selectedMetricForDetails || ''}
        runs={filteredRuns}
        period={getPeriodLabel()}
      />
    </div>
  );
};