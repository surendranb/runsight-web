import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Award, Calendar } from 'lucide-react';
import { EnrichedRun } from '../../types';

interface PaceTrendChartProps {
  data: EnrichedRun[];
  period: string;
  showMovingAverage?: boolean;
  highlightPersonalRecords?: boolean;
  showWeatherIndicators?: boolean;
}

interface ChartDataPoint {
  date: string;
  pace: number;
  movingAverage?: number;
  isPR?: boolean;
  weather?: string;
  distance: number;
  name: string;
}

export const PaceTrendChart: React.FC<PaceTrendChartProps> = ({
  data,
  period,
  showMovingAverage = true,
  highlightPersonalRecords = true,
  showWeatherIndicators = true
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'30d' | '90d' | '1y'>('30d');
  // Transform runs data into chart format
  const chartData: ChartDataPoint[] = React.useMemo(() => {
    const sortedRuns = [...data]
      .filter(run => run.distance > 0 && run.moving_time > 0)
      .sort((a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime());

    let bestPace = Infinity;
    
    return sortedRuns.map((run, index) => {
      const paceSeconds = run.moving_time / (run.distance / 1000);
      const isPR = highlightPersonalRecords && paceSeconds < bestPace;
      if (isPR) bestPace = paceSeconds;
      
      // Calculate moving average (last 5 runs)
      let movingAverage;
      if (showMovingAverage && index >= 4) {
        const recentRuns = sortedRuns.slice(index - 4, index + 1);
        const avgPace = recentRuns.reduce((sum, r) => sum + (r.moving_time / (r.distance / 1000)), 0) / recentRuns.length;
        movingAverage = avgPace;
      }
      
      // Get weather info
      let weather;
      if (showWeatherIndicators && run.weather_data) {
        const weatherData = run.weather_data as any;
        weather = weatherData.weather?.main || weatherData.main || 'Unknown';
      }
      
      return {
        date: new Date(run.start_date_local).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        pace: paceSeconds,
        movingAverage,
        isPR,
        weather,
        distance: run.distance / 1000,
        name: run.name
      };
    });
  }, [data, showMovingAverage, highlightPersonalRecords, showWeatherIndicators]);

  const formatPace = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-sm">
            <span className="font-medium">Pace:</span> {formatPace(data.pace)}/km
          </p>
          <p className="text-sm">
            <span className="font-medium">Distance:</span> {data.distance.toFixed(2)} km
          </p>
          {data.weather && (
            <p className="text-sm">
              <span className="font-medium">Weather:</span> {data.weather}
            </p>
          )}
          {data.isPR && (
            <p className="text-sm font-medium text-green-600">🏆 Personal Record!</p>
          )}
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Pace Trend - {period}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>No pace data available for the selected period</p>
        </div>
      </div>
    );
  }

  // Calculate trend statistics
  const trendStats = React.useMemo(() => {
    if (chartData.length < 2) return null;
    
    const firstPace = chartData[0].pace;
    const lastPace = chartData[chartData.length - 1].pace;
    const improvement = ((firstPace - lastPace) / firstPace) * 100;
    const isImproving = improvement > 0;
    
    const personalRecords = chartData.filter(d => d.isPR).length;
    
    return {
      improvement: Math.abs(improvement),
      isImproving,
      personalRecords,
      totalRuns: chartData.length
    };
  }, [chartData]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Pace Trend - {period}</h3>
        {trendStats && (
          <div className="flex items-center space-x-2 text-sm">
            {trendStats.isImproving ? (
              <div className="flex items-center text-green-600">
                <TrendingDown className="w-4 h-4 mr-1" />
                <span className="font-medium">{trendStats.improvement.toFixed(1)}% faster</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span className="font-medium">{trendStats.improvement.toFixed(1)}% slower</span>
              </div>
            )}
            {trendStats.personalRecords > 0 && (
              <div className="flex items-center text-yellow-600 ml-3">
                <Award className="w-4 h-4 mr-1" />
                <span className="font-medium">{trendStats.personalRecords} PR{trendStats.personalRecords > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis 
              tickFormatter={formatPace}
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              domain={['dataMin - 10', 'dataMax + 10']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="pace"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (payload.isPR) {
                  return <circle cx={cx} cy={cy} r={4} fill="#10b981" stroke="#ffffff" strokeWidth={2} />;
                }
                return <circle cx={cx} cy={cy} r={2} fill="#3b82f6" />;
              }}
              activeDot={{ r: 4, fill: '#3b82f6' }}
            />
            {showMovingAverage && (
              <Line
                type="monotone"
                dataKey="movingAverage"
                stroke="#6b7280"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="5-run average"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-0.5 bg-blue-500 mr-2"></div>
            <span>Pace</span>
          </div>
          {showMovingAverage && (
            <div className="flex items-center">
              <div className="w-3 h-0.5 bg-gray-400 border-dashed mr-2"></div>
              <span>5-run average</span>
            </div>
          )}
          {highlightPersonalRecords && (
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span>Personal Record</span>
            </div>
          )}
        </div>
        <span>Lower is better</span>
      </div>
    </div>
  );
};