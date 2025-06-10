// src/components/insights/ConsistencyInsight.tsx
import React, { useMemo } from 'react';
import { EnrichedRun } from '../../types';
import { groupRunsByWeek, groupRunsByMonth, TimeGroupData } from '../../lib/insights/consistencyUtils';

interface ConsistencyInsightProps {
  runs: EnrichedRun[];
}

const formatDistanceKm = (meters: number) => (meters / 1000).toFixed(1) + 'km';
const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const ChartPlaceholder: React.FC<{title: string, data: TimeGroupData[], dataKey: keyof TimeGroupData, unit: string}> = ({ title, data, dataKey, unit }) => (
 <div className="p-4 border rounded-lg bg-gray-50">
     <h4 className="font-semibold text-gray-700 mb-2">{title}</h4>
     {data.length > 0 ? (
         <ul className="text-xs space-y-1">
             {data.slice(-5).map(item => ( // Show last 5 periods for brevity
                 <li key={item.label} className="flex justify-between">
                     <span>{item.label}:</span>
                     <span className="font-medium">
                         {dataKey === 'totalDistance' ? formatDistanceKm(item[dataKey] as number) :
                          dataKey === 'totalMovingTime' ? formatDuration(item[dataKey] as number) :
                          item[dataKey]} {unit}
                     </span>
                 </li>
             ))}
         </ul>
     ) : <p className="text-sm text-gray-500">Not enough data.</p>}
     <p className="text-center text-xs text-gray-400 mt-2">(Chart placeholder)</p>
 </div>
);


export const ConsistencyInsight: React.FC<ConsistencyInsightProps> = ({ runs }) => {
  const weeklyData = useMemo(() => groupRunsByWeek(runs), [runs]);
  const monthlyData = useMemo(() => groupRunsByMonth(runs), [runs]);

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
                 <p className="text-blue-600 text-sm">Distance: {formatDistanceKm(lastWeek.totalDistance)}</p>
                 <p className="text-blue-600 text-sm">Time: {formatDuration(lastWeek.totalMovingTime)}</p>
             </div>
         )}
         {lastMonth && (
              <div className="bg-green-50 p-4 rounded-lg">
                 <h4 className="font-semibold text-green-700">This Month ({lastMonth.label.split(' ')[0]})</h4>
                 <p className="text-green-600 text-sm">Runs: {lastMonth.runCount}</p>
                 <p className="text-green-600 text-sm">Distance: {formatDistanceKm(lastMonth.totalDistance)}</p>
                 <p className="text-green-600 text-sm">Time: {formatDuration(lastMonth.totalMovingTime)}</p>
             </div>
         )}
      </div>

      {/* Weekly Charts Placeholder */}
      <div className="mb-6">
        <h4 className="text-lg font-medium text-gray-700 mb-3">Weekly Trends</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ChartPlaceholder title="Distance per Week" data={weeklyData} dataKey="totalDistance" unit="km" />
          <ChartPlaceholder title="Time per Week" data={weeklyData} dataKey="totalMovingTime" unit="duration" />
          <ChartPlaceholder title="Runs per Week" data={weeklyData} dataKey="runCount" unit="runs" />
        </div>
      </div>

      {/* Monthly Charts Placeholder */}
      <div>
        <h4 className="text-lg font-medium text-gray-700 mb-3">Monthly Trends</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ChartPlaceholder title="Distance per Month" data={monthlyData} dataKey="totalDistance" unit="km" />
          <ChartPlaceholder title="Time per Month" data={monthlyData} dataKey="totalMovingTime" unit="duration" />
          <ChartPlaceholder title="Runs per Month" data={monthlyData} dataKey="runCount" unit="runs" />
        </div>
      </div>
    </div>
  );
};
