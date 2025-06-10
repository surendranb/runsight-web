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
import { EnrichedRun } from '../../types';
import { groupRunsByWeek, groupRunsByMonth, TimeGroupData } from '../../lib/insights/consistencyUtils';
import { convertSecondsToHoursMinutes } from '@/utils/utils';

interface ConsistencyInsightProps {
  runs: EnrichedRun[];
}

export const ConsistencyInsight: React.FC<ConsistencyInsightProps> = ({ runs }) => {
  const weeklyData = useMemo(() => groupRunsByWeek(runs), [runs]);
  const monthlyData = useMemo(() => groupRunsByMonth(runs), [runs]);

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
