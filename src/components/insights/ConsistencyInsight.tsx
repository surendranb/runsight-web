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

  // Helper function to render charts or "Not enough data" message
  const renderChart = (
    title: string,
    chartData: TimeGroupData[],
    chartType: "line" | "bar",
    dataKey: keyof TimeGroupData,
    yAxisFormatter?: (value: any) => string,
    tooltipFormatter?: (value: any, name: string, props: any) => [string, string] | string,
    yAxisUnit?: string,
  ) => {
    if (chartData.length < 2) {
      return (
        <div className="p-4 border rounded-lg shadow bg-gray-50">
          <h3 className="text-lg font-semibold mb-2 text-gray-700">{title}</h3>
          <p className="text-sm text-gray-500">Not enough data to display chart.</p>
        </div>
      );
    }

    const ChartComponent = chartType === "line" ? LineChart : BarChart;
    const ChartSeries = chartType === "line" ? Line : Bar;

    return (
      <div className="p-4 border rounded-lg shadow bg-gray-50">
        <h3 className="text-lg font-semibold mb-2 text-gray-700">{title}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ChartComponent data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={yAxisFormatter} unit={yAxisUnit} tick={{ fontSize: 12 }} />
            <Tooltip formatter={tooltipFormatter} />
            <Legend />
            <ChartSeries
              type="monotone"
              dataKey={dataKey}
              stroke="#8884d8"
              fill={chartType === 'bar' ? "#8884d8" : undefined} // Fill for Bar chart
              activeDot={chartType === 'line' ? { r: 6 } : undefined}
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
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Consistency & Progress Over Time</h3>
      <p className="text-sm text-gray-600 mb-6">Track your running frequency and volume trends on a weekly and monthly basis to see your progress.</p>

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

      {/* Weekly Charts */}
      <div className="mb-6">
        <h4 className="text-lg font-medium text-gray-700 mb-3">Weekly Trends</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderChart(
            "Distance per Week",
            weeklyData,
            "line",
            "totalDistance",
            (value) => `${(value / 1000).toFixed(1)} km`,
            (value) => `${(value as number / 1000).toFixed(1)} km`,
          )}
          {renderChart(
            "Time per Week",
            weeklyData,
            "line",
            "totalMovingTime",
            formatTime,
            (value) => formatTime(value as number),
          )}
          {renderChart(
            "Runs per Week",
            weeklyData,
            "bar",
            "runCount",
            undefined,
            (value) => `${value} runs`,
            " runs"
          )}
        </div>
      </div>

      {/* Monthly Charts */}
      <div>
        <h4 className="text-lg font-medium text-gray-700 mb-3">Monthly Trends</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderChart(
            "Distance per Month",
            monthlyData,
            "line",
            "totalDistance",
            (value) => `${(value / 1000).toFixed(1)} km`,
            (value) => `${(value as number / 1000).toFixed(1)} km`,
          )}
          {renderChart(
            "Time per Month",
            monthlyData,
            "line",
            "totalMovingTime",
            formatTime,
            (value) => formatTime(value as number),
          )}
          {renderChart(
            "Runs per Month",
            monthlyData,
            "bar",
            "runCount",
            undefined,
            (value) => `${value} runs`,
            " runs"
          )}
        </div>
      </div>
    </div>
  );
};
