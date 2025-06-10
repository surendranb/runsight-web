import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Activity } from '../types';

interface ActivityChartProps {
  activities: Activity[];
}

export const ActivityChart: React.FC<ActivityChartProps> = ({ activities }) => {
  const chartData = activities
    .slice(0, 20)
    .reverse()
    .map((activity, index) => ({
      run: index + 1,
      distance: (activity.distance / 1000).toFixed(1),
      pace: ((activity.moving_time / 60) / (activity.distance / 1000)).toFixed(1),
      date: new Date(activity.start_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    }));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Distance Trends</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ value: 'Distance (km)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: any, name: string) => [
                `${value} ${name === 'distance' ? 'km' : 'min/km'}`,
                name === 'distance' ? 'Distance' : 'Pace'
              ]}
            />
            <Line
              type="monotone"
              dataKey="distance"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};