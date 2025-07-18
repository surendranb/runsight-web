import React, { useState, useMemo } from 'react';
import { User, EnrichedRun } from '../types';
import { KeyPerformanceCard } from './dashboard/KeyPerformanceCard';
import { PaceTrendChart } from './dashboard/PaceTrendChart';
import { ActivityTimeline } from './dashboard/ActivityTimeline';
import { InsightCard } from './dashboard/InsightCard';
import { Activity, MapPin, Clock, Settings, RefreshCw } from 'lucide-react';

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

  // Filter runs based on selected period
  const filteredRuns = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (selectedPeriod) {
      case 'last30':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        if (!customDateRange.start) return runs;
        startDate = new Date(customDateRange.start);
        const endDate = customDateRange.end ? new Date(customDateRange.end) : now;
        return runs.filter(run => {
          const runDate = new Date(run.start_date_local);
          return runDate >= startDate && runDate <= endDate;
        });
      case 'allTime':
      default:
        return runs;
    }

    return runs.filter(run => new Date(run.start_date_local) >= startDate);
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


      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-lg">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.name}</h1>
                <p className="text-gray-600">Here's your running performance overview</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {onSync && (
                <button
                  onClick={onSync}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Data
                </button>
              )}
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Period Selector */}
          <div className="mt-6 flex items-center space-x-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['last30', 'thisYear', 'allTime', 'custom'] as TimePeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedPeriod === period
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {period === 'last30' ? 'Last 30 Days' : 
                   period === 'thisYear' ? 'This Year' :
                   period === 'allTime' ? 'All Time' : 'Custom'}
                </button>
              ))}
            </div>
            
            {selectedPeriod === 'custom' && (
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            {/* Key Performance Card */}
            {metrics.avgPace > 0 && (
              <KeyPerformanceCard
                metric="Average Pace"
                value={formatPace(metrics.avgPace)}
                unit="min/km"
                trend={metrics.paceImprovement}
                comparisonPeriod={getPeriodLabel()}
                previousValue={metrics.avgPacePrevious > 0 ? formatPace(metrics.avgPacePrevious) : formatPace(metrics.avgPace)}
              />
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-full mr-4">
                    <Activity className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Runs</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.totalRuns}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-full mr-4">
                    <MapPin className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Distance</p>
                    <p className="text-2xl font-bold text-gray-900">{formatDistance(metrics.totalDistance)} km</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-100 rounded-full mr-4">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Time</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.floor(metrics.totalTime / 3600)}h {Math.floor((metrics.totalTime % 3600) / 60)}m
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts and Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <PaceTrendChart
                data={filteredRuns}
                period={getPeriodLabel()}
                showMovingAverage={true}
                highlightPersonalRecords={true}
                showWeatherIndicators={true}
              />
              
              <ActivityTimeline
                activities={filteredRuns.slice().reverse()}
                limit={8}
                showWeather={true}
                colorCodeByPerformance={true}
              />
            </div>

            {/* Insights */}
            {insights.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Insights</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {insights.map((insight, index) => (
                    <InsightCard
                      key={index}
                      icon={insight.icon}
                      title={insight.title}
                      insight={insight.insight}
                      actionable={insight.actionable}
                      confidence={insight.confidence}
                    />
                  ))}
                </div>
              </div>
            )}


          </div>
        )}
      </div>
    </div>
  );
};