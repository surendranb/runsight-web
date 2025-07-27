import React, { useState, useMemo } from 'react';
import { User, EnrichedRun } from '../types';
import { PrimaryKPISystem } from './dashboard/PrimaryKPISystem';
import { ProgressiveDisclosurePanel } from './dashboard/ProgressiveDisclosurePanel';
import { PaceTrendChart } from './dashboard/PaceTrendChart';
import { ActivityTimeline } from './dashboard/ActivityTimeline';
import { InsightCard } from './dashboard/InsightCard';
import { TimePeriodSelector, TimePeriod, Breadcrumb, SectionIndicator } from './common/TimePeriodSelector';
import { StandardButton } from './common/StandardButton';
import { standardTimePeriods } from '../lib/chartTheme';
import { smartDefaults } from '../lib/smartDefaults';
import { Activity, MapPin, Clock, Settings, RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Lightbulb, TrendingUp as TrendingUpIcon } from 'lucide-react';
import { filterOutliers, getOutlierStats } from '../lib/outlierDetection';

interface ModernDashboardProps {
  user: User;
  runs: EnrichedRun[];
  isLoading: boolean;
  error: string | null;
  onSync?: () => void;
  onLogout: () => void;
}

// Use standardized TimePeriod from common component

export const ModernDashboard: React.FC<ModernDashboardProps> = ({
  user,
  runs,
  isLoading,
  error,
  onSync,
  onLogout
}) => {
  // Initialize with smart defaults
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(() => 
    smartDefaults.getSmartTimePeriod(runs) as TimePeriod
  );
  
  // Progressive disclosure state with smart defaults
  const [selectedMetricForDetails, setSelectedMetricForDetails] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => 
    smartDefaults.getPreferences().dashboardLayout.expandedSections
  );

  // Smart chart settings
  const [chartSettings, setChartSettings] = useState(() => 
    smartDefaults.getSmartChartSettings(runs)
  );

  // Update smart defaults when runs data changes
  React.useEffect(() => {
    if (runs.length > 0) {
      const smartPeriod = smartDefaults.getSmartTimePeriod(runs) as TimePeriod;
      const smartChartSettings = smartDefaults.getSmartChartSettings(runs);
      
      // Only update if different from current settings
      if (smartPeriod !== selectedPeriod) {
        setSelectedPeriod(smartPeriod);
      }
      
      setChartSettings(smartChartSettings);
    }
  }, [runs.length]); // Only run when runs count changes, not on every render

  // Toggle section expansion with preference recording
  const toggleSection = (section: string) => {
    const newExpanded = !expandedSections[section];
    setExpandedSections(prev => ({
      ...prev,
      [section]: newExpanded
    }));
    
    // Record user preference
    smartDefaults.recordInteraction('toggleSection', {
      section,
      expanded: newExpanded
    });
  };

  // Handle period change with preference recording
  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
    smartDefaults.recordInteraction('changePeriod', { period });
  };

  // Filter runs based on selected period and remove outliers
  const filteredRuns = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let dateFilteredRuns: EnrichedRun[];

    switch (selectedPeriod) {
      case 'last7':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilteredRuns = runs.filter(run => new Date(run.start_date_local) >= startDate);
        break;
      case 'last30':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilteredRuns = runs.filter(run => new Date(run.start_date_local) >= startDate);
        break;
      case 'last90':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        dateFilteredRuns = runs.filter(run => new Date(run.start_date_local) >= startDate);
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilteredRuns = runs.filter(run => new Date(run.start_date_local) >= startDate);
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        dateFilteredRuns = runs.filter(run => {
          const runDate = new Date(run.start_date_local);
          return runDate >= startDate && runDate <= endDate;
        });
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        dateFilteredRuns = runs.filter(run => new Date(run.start_date_local) >= startDate);
        break;
      case 'lastYear':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
        dateFilteredRuns = runs.filter(run => {
          const runDate = new Date(run.start_date_local);
          return runDate >= startDate && runDate <= lastYearEnd;
        });
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
    const periodDays = selectedPeriod === 'last7' ? 7 : 
                      selectedPeriod === 'last30' ? 30 : 
                      selectedPeriod === 'last90' ? 90 :
                      selectedPeriod === 'thisYear' ? 365 : 90;
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

  // Get significant changes automatically highlighted
  const significantChanges = useMemo(() => 
    smartDefaults.getSignificantChanges(filteredRuns), 
    [filteredRuns]
  );

  // Generate insights with smart defaults
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
    return standardTimePeriods[selectedPeriod] || 'Last 30 Days';
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
          <StandardButton
            onClick={() => window.location.reload()}
            variant="primary"
            size="md"
          >
            Retry
          </StandardButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Standardized Header with Clear Information Hierarchy */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Breadcrumb Navigation */}
          <Breadcrumb 
            items={[
              { label: 'RunSight', onClick: () => {} },
              { label: 'Dashboard', isActive: true }
            ]}
            className="mb-3"
          />
          
          <SectionIndicator
            title={`Welcome back, ${user.name}`}
            subtitle={`${metrics.totalRuns} runs • ${getDataFreshnessIndicator()}`}
            badge={{
              text: getPeriodLabel(),
              color: 'blue'
            }}
            actions={
              <div className="flex items-center space-x-2">
                {onSync && (
                  <StandardButton
                    onClick={onSync}
                    variant="primary"
                    size="md"
                    icon={RefreshCw}
                    iconPosition="left"
                  >
                    Sync Data
                  </StandardButton>
                )}
                
                <TimePeriodSelector
                  selectedPeriod={selectedPeriod}
                  onPeriodChange={handlePeriodChange}
                  availablePeriods={['last7', 'last30', 'last90', 'thisYear', 'allTime']}
                  showIcon={true}
                  size="md"
                />
              </div>
            }
          />
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
            {/* Significant Changes Alert - Smart Highlighting */}
            {significantChanges.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start space-x-3">
                  <Lightbulb className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">
                      Significant Changes Detected
                    </h3>
                    <div className="space-y-3">
                      {significantChanges.slice(0, 2).map((change, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            change.type === 'improvement' ? 'bg-green-500' :
                            change.type === 'achievement' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} />
                          <div>
                            <p className="text-blue-800 font-medium">{change.description}</p>
                            <div className="flex items-center mt-1">
                              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                {(change.confidence * 100).toFixed(0)}% confidence
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {significantChanges.length > 2 && (
                      <button 
                        onClick={() => {/* TODO: Show all changes */}}
                        className="text-sm text-blue-600 hover:text-blue-800 mt-2 font-medium"
                      >
                        View {significantChanges.length - 2} more changes →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* KPI System */}
            <PrimaryKPISystem
              runs={filteredRuns}
              period={getPeriodLabel()}
              onViewDetails={(metric) => {
                setSelectedMetricForDetails(metric);
              }}
            />

            {/* Pace Trend Analysis - Standardized Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <SectionIndicator
                  title="Pace Trend Analysis"
                  subtitle="Interactive chart showing pace improvements, moving averages, and performance patterns"
                  badge={{
                    text: `${filteredRuns.length} runs analyzed`,
                    color: 'blue'
                  }}
                  actions={
                    <span className="text-xs text-gray-500">{getDataFreshnessIndicator()}</span>
                  }
                />
              </div>
              
              <div className="p-6">
                <PaceTrendChart
                  data={filteredRuns}
                  period={getPeriodLabel()}
                  showMovingAverage={chartSettings.showMovingAverage}
                  highlightPersonalRecords={chartSettings.highlightPersonalRecords}
                  showWeatherIndicators={chartSettings.showWeatherIndicators}
                />
              </div>
            </div>

            {/* Activity Timeline - Standardized Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <SectionIndicator
                  title="Recent Activity Timeline"
                  subtitle="Your most recent runs with weather data, pace, and performance indicators"
                  badge={{
                    text: `Latest ${Math.min(filteredRuns.length, 8)} runs`,
                    color: 'green'
                  }}
                  actions={
                    <span className="text-xs text-gray-500">Most recent first</span>
                  }
                />
              </div>
              
              <div className="p-6">
                <ActivityTimeline
                  activities={filteredRuns
                    .sort((a, b) => new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime())
                    .slice(0, 8)
                  }
                  limit={8}
                  showWeather={chartSettings.showWeatherIndicators}
                  colorCodeByPerformance={true}
                />
              </div>
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