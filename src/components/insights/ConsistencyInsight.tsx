// src/components/insights/ConsistencyInsight.tsx
import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Activity, CheckCircle } from 'lucide-react';
import { EnrichedRun } from '../../types';
import { groupRunsByWeek, groupRunsByMonth, TimeGroupData, analyzeConsistency } from '../../lib/insights/consistencyUtils';
import { convertSecondsToHoursMinutes } from '../../lib/insightsUtils';
import { chartTheme, chartDefaults, createStandardTooltip, ChartTitle, axisFormatters } from '../../lib/chartTheme';

interface ConsistencyInsightProps {
  runs: EnrichedRun[];
}

export const ConsistencyInsight: React.FC<ConsistencyInsightProps> = ({ runs }) => {
  const weeklyData = useMemo(() => groupRunsByWeek(runs), [runs]);
  const monthlyData = useMemo(() => groupRunsByMonth(runs), [runs]);
  const consistencyAnalysis = useMemo(() => analyzeConsistency(runs), [runs]);

  // Helper function to format time for YAxis and Tooltip
  const formatTime = (timeInSeconds: number) => {
    const { hours, minutes } = convertSecondsToHoursMinutes(timeInSeconds);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Helper function to render standardized charts
  const renderChart = (
    title: string,
    chartData: TimeGroupData[],
    chartType: "line" | "bar",
    dataKey: keyof TimeGroupData,
    yAxisFormatter?: (value: any) => string,
    yAxisLabel?: string,
  ) => {
    if (chartData.length < 2) {
      return (
        <div className="p-4 border rounded-lg shadow bg-gray-50">
          <ChartTitle title={title} />
          <div className="flex items-center justify-center h-48 text-gray-500">
            <div className="text-center">
              <Activity className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Not enough data to display chart</p>
              <p className="text-xs text-gray-400">Need at least 2 data points</p>
            </div>
          </div>
        </div>
      );
    }

    const ChartComponent = chartType === "line" ? LineChart : BarChart;
    const ChartSeries = chartType === "line" ? Line : Bar;
    
    // Create appropriate tooltip formatters
    const tooltipFormatters: Record<string, (value: any) => string> = {};
    if (dataKey === 'totalDistance') {
      tooltipFormatters[dataKey as string] = (value: number) => axisFormatters.distance(value);
    } else if (dataKey === 'totalMovingTime') {
      tooltipFormatters[dataKey as string] = (value: number) => axisFormatters.duration(value);
    } else if (dataKey === 'runCount') {
      tooltipFormatters[dataKey as string] = (value: number) => `${value} runs`;
    }

    return (
      <div className="p-4 border rounded-lg shadow bg-white">
        <ChartTitle title={title} dataCount={chartData.length} />
        <ResponsiveContainer width="100%" height={chartDefaults.height}>
          <ChartComponent data={chartData} margin={chartDefaults.margin}>
            <CartesianGrid {...chartDefaults.grid} />
            <XAxis 
              dataKey="label" 
              {...chartDefaults.axis}
              label={{ value: 'Time Period', position: 'insideBottom', offset: -10 }}
            />
            <YAxis 
              tickFormatter={yAxisFormatter}
              {...chartDefaults.axis}
              label={{ value: yAxisLabel || '', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={createStandardTooltip(tooltipFormatters)} />
            <ChartSeries
              type={chartType === 'line' ? 'monotone' : undefined}
              dataKey={dataKey}
              stroke={chartTheme.colors.primary}
              fill={chartType === 'bar' ? chartTheme.colors.primary : undefined}
              strokeWidth={chartType === 'line' ? 2 : undefined}
              activeDot={chartType === 'line' ? { r: 4, fill: chartTheme.colors.primary } : undefined}
            />
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    );
  };

  if (runs.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">Consistency & Progress</h3>
        <p className="text-gray-600">No run data available to show consistency insights.</p>
      </div>
    );
  }

  const lastWeek = weeklyData.length > 0 ? weeklyData[weeklyData.length -1] : null;
  const lastMonth = monthlyData.length > 0 ? monthlyData[monthlyData.length -1] : null;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <ChartTitle 
        title="Running Consistency Analysis"
        subtitle="Track your running frequency, volume trends, and consistency patterns over time"
        dataCount={runs.length}
      />

      {/* Consistency Analysis */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
        <h4 className="font-semibold text-purple-800 mb-3">Consistency Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{consistencyAnalysis.consistencyScore.toFixed(0)}</div>
            <div className="text-sm text-purple-700">Consistency Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{consistencyAnalysis.frequency.runsPerWeek.toFixed(1)}</div>
            <div className="text-sm text-blue-700">Runs/Week</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{consistencyAnalysis.streaks.longest}</div>
            <div className="text-sm text-green-700">Longest Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{consistencyAnalysis.frequency.averageGapDays.toFixed(1)}</div>
            <div className="text-sm text-orange-700">Avg Gap (days)</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Trend:</span>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${
              consistencyAnalysis.trend === 'improving' ? 'bg-green-100 text-green-800' :
              consistencyAnalysis.trend === 'declining' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {consistencyAnalysis.trend.charAt(0).toUpperCase() + consistencyAnalysis.trend.slice(1)}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Most Active Day:</span>
            <span className="ml-2 text-gray-600">{consistencyAnalysis.frequency.mostConsistentDay}</span>
          </div>
        </div>
        
        {consistencyAnalysis.recommendations.length > 0 && (
          <div className="mt-4">
            <span className="font-medium text-gray-700 block mb-2">Recommendations:</span>
            <ul className="text-sm text-gray-600 space-y-1">
              {consistencyAnalysis.recommendations.slice(0, 3).map((rec, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-purple-500 mr-2">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
         {lastWeek && (
             <div className="bg-blue-50 p-4 rounded-lg">
                 <h4 className="font-semibold text-blue-700">This Week ({lastWeek.label.replace('Week of ','')})</h4>
                 <p className="text-blue-600 text-sm">Runs: {lastWeek.runCount}</p>
                 <p className="text-blue-600 text-sm">Distance: {(lastWeek.totalDistance / 1000).toFixed(1)}km</p>
                 <p className="text-blue-600 text-sm">Time: {formatTime(lastWeek.totalMovingTime)}</p>
             </div>
         )}
         {lastMonth && (
              <div className="bg-green-50 p-4 rounded-lg">
                 <h4 className="font-semibold text-green-700">This Month ({lastMonth.label.split(' ')[0]})</h4>
                 <p className="text-green-600 text-sm">Runs: {lastMonth.runCount}</p>
                 <p className="text-green-600 text-sm">Distance: {(lastMonth.totalDistance / 1000).toFixed(1)}km</p>
                 <p className="text-green-600 text-sm">Time: {formatTime(lastMonth.totalMovingTime)}</p>
             </div>
         )}
      </div>

      {/* Weekly Trends - Line charts for time series data */}
      <div className="mb-6">
        <h4 className="text-lg font-medium text-gray-700 mb-3 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Weekly Trends
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {renderChart(
            "Weekly Distance",
            weeklyData,
            "line",
            "totalDistance",
            (value) => axisFormatters.distance(value),
            "Distance (km)"
          )}
          {renderChart(
            "Weekly Training Time",
            weeklyData,
            "line",
            "totalMovingTime",
            formatTime,
            "Time"
          )}
          {renderChart(
            "Weekly Run Frequency",
            weeklyData,
            "bar",
            "runCount",
            (value) => `${value}`,
            "Number of Runs"
          )}
        </div>
      </div>

      {/* Monthly Trends - Line charts for time series data */}
      <div>
        <h4 className="text-lg font-medium text-gray-700 mb-3 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Monthly Trends
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {renderChart(
            "Monthly Distance",
            monthlyData,
            "line",
            "totalDistance",
            (value) => axisFormatters.distance(value),
            "Distance (km)"
          )}
          {renderChart(
            "Monthly Training Time",
            monthlyData,
            "line",
            "totalMovingTime",
            formatTime,
            "Time"
          )}
          {renderChart(
            "Monthly Run Frequency",
            monthlyData,
            "bar",
            "runCount",
            (value) => `${value}`,
            "Number of Runs"
          )}
        </div>
      </div>
    </div>
  );
};
