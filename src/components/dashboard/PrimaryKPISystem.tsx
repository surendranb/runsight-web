import React from 'react';
import { KeyPerformanceCard } from './KeyPerformanceCard';
import { EnrichedRun } from '../../types';
import { Activity, MapPin, Clock, TrendingUp } from 'lucide-react';

interface PrimaryKPISystemProps {
  runs: EnrichedRun[];
  period: string;
  onViewDetails?: (metric: string) => void;
}

interface KPIMetric {
  id: string;
  metric: string;
  value: string;
  unit: string;
  trend: number;
  trendDirection: 'up' | 'down' | 'stable';
  comparisonPeriod: string;
  previousValue: string;
  contextTooltip: string;
  priority: 'primary' | 'secondary';
  icon: React.ReactNode;
}

export const PrimaryKPISystem: React.FC<PrimaryKPISystemProps> = ({
  runs,
  period,
  onViewDetails
}) => {
  // Calculate metrics from runs data
  const calculateMetrics = (): KPIMetric[] => {
    if (runs.length === 0) {
      return [];
    }

    const totalDistance = runs.reduce((sum, run) => sum + run.distance, 0);
    const totalTime = runs.reduce((sum, run) => sum + run.moving_time, 0);
    const avgPace = totalTime / (totalDistance / 1000);
    const totalRuns = runs.length;

    // Calculate previous period for comparison (simplified for demo)
    const periodDays = period.includes('30') ? 30 : period.includes('Year') ? 365 : 90;
    const previousPeriodRuns = runs.slice(0, Math.floor(runs.length / 2)); // Simplified comparison
    
    let previousMetrics = {
      avgPace: 0,
      totalDistance: 0,
      totalRuns: 0,
      totalTime: 0
    };

    if (previousPeriodRuns.length > 0) {
      const prevTotalDistance = previousPeriodRuns.reduce((sum, run) => sum + run.distance, 0);
      const prevTotalTime = previousPeriodRuns.reduce((sum, run) => sum + run.moving_time, 0);
      previousMetrics = {
        avgPace: prevTotalTime / (prevTotalDistance / 1000),
        totalDistance: prevTotalDistance,
        totalRuns: previousPeriodRuns.length,
        totalTime: prevTotalTime
      };
    }

    // Helper functions
    const formatPace = (seconds: number) => {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDistance = (meters: number) => (meters / 1000).toFixed(0);

    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    const getTrendDirection = (current: number, previous: number, lowerIsBetter: boolean = false): 'up' | 'down' | 'stable' => {
      if (previous === 0) return 'stable';
      const change = (current - previous) / previous;
      if (Math.abs(change) < 0.05) return 'stable'; // Less than 5% change is stable
      
      if (lowerIsBetter) {
        return change < 0 ? 'up' : 'down'; // For pace, lower is better
      } else {
        return change > 0 ? 'up' : 'down'; // For distance/runs, higher is better
      }
    };

    // Define the maximum 4 primary KPIs based on importance and actionability
    const metrics: KPIMetric[] = [
      {
        id: 'avg_pace',
        metric: 'Average Pace',
        value: formatPace(avgPace),
        unit: 'min/km',
        trend: previousMetrics.avgPace > 0 ? (avgPace - previousMetrics.avgPace) / previousMetrics.avgPace : 0,
        trendDirection: getTrendDirection(avgPace, previousMetrics.avgPace, true),
        comparisonPeriod: `previous ${period.toLowerCase()}`,
        previousValue: formatPace(previousMetrics.avgPace || avgPace),
        contextTooltip: 'Your average pace shows how fast you typically run. Consistent improvement in pace indicates better fitness and endurance.',
        priority: 'primary',
        icon: <TrendingUp className="w-6 h-6" />
      },
      {
        id: 'total_distance',
        metric: 'Total Distance',
        value: formatDistance(totalDistance),
        unit: 'km',
        trend: previousMetrics.totalDistance > 0 ? (totalDistance - previousMetrics.totalDistance) / previousMetrics.totalDistance : 0,
        trendDirection: getTrendDirection(totalDistance, previousMetrics.totalDistance),
        comparisonPeriod: `previous ${period.toLowerCase()}`,
        previousValue: formatDistance(previousMetrics.totalDistance || totalDistance),
        contextTooltip: 'Total distance covered shows your training volume. Higher volume generally leads to better endurance and fitness.',
        priority: 'primary',
        icon: <MapPin className="w-6 h-6" />
      },
      {
        id: 'total_runs',
        metric: 'Total Runs',
        value: totalRuns.toString(),
        unit: 'runs',
        trend: previousMetrics.totalRuns > 0 ? (totalRuns - previousMetrics.totalRuns) / previousMetrics.totalRuns : 0,
        trendDirection: getTrendDirection(totalRuns, previousMetrics.totalRuns),
        comparisonPeriod: `previous ${period.toLowerCase()}`,
        previousValue: (previousMetrics.totalRuns || totalRuns).toString(),
        contextTooltip: 'Frequency of runs indicates consistency in your training. Regular running is key to building and maintaining fitness.',
        priority: 'primary',
        icon: <Activity className="w-6 h-6" />
      },
      {
        id: 'total_time',
        metric: 'Total Time',
        value: formatTime(totalTime),
        unit: '',
        trend: previousMetrics.totalTime > 0 ? (totalTime - previousMetrics.totalTime) / previousMetrics.totalTime : 0,
        trendDirection: getTrendDirection(totalTime, previousMetrics.totalTime),
        comparisonPeriod: `previous ${period.toLowerCase()}`,
        previousValue: formatTime(previousMetrics.totalTime || totalTime),
        contextTooltip: 'Time spent running reflects your training commitment. More time generally leads to better endurance and cardiovascular health.',
        priority: 'primary',
        icon: <Clock className="w-6 h-6" />
      }
    ];

    return metrics;
  };

  const metrics = calculateMetrics();

  if (metrics.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Performance Data</h3>
        <p className="text-gray-600">
          Once you have some runs recorded, your key performance indicators will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section header with clear information scent */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Key Performance Indicators</h2>
        <p className="text-gray-600">
          The 4 most important metrics to track your running progress for {period.toLowerCase()}
        </p>
      </div>

      {/* Primary KPI Cards - Maximum 4 cards in responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <KeyPerformanceCard
            key={metric.id}
            metric={metric.metric}
            value={metric.value}
            unit={metric.unit}
            trend={metric.trend}
            trendDirection={metric.trendDirection}
            comparisonPeriod={metric.comparisonPeriod}
            previousValue={metric.previousValue}
            contextTooltip={metric.contextTooltip}
            priority={metric.priority}
            onViewDetails={onViewDetails ? () => onViewDetails(metric.id) : undefined}
          />
        ))}
      </div>

      {/* Visual grouping indicator */}
      <div className="text-center">
        <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          <span>Primary performance metrics</span>
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};