// src/components/insights/PerformanceWeatherInsight.tsx
import React, { useMemo } from 'react';
import { EnrichedRun } from '../../types';
import { getPerformanceByTemperature, getPerformanceByHumidity, PerformanceBucket } from '../../lib/insights/weatherPerformanceUtils';

interface PerformanceWeatherInsightProps {
  runs: EnrichedRun[];
}

const formatPaceDisplay = (pace: number | null): string => {
  if (pace === null || pace === 0) return "N/A";
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} min/km`;
};

const formatHeartRateDisplay = (hr: number | null): string => {
  if (hr === null) return "N/A";
  return `${Math.round(hr)} bpm`;
};

const DataTable: React.FC<{title: string, data: PerformanceBucket[], type: 'Pace' | 'HR'}> = ({title, data, type}) => (
    <div className="p-3 border rounded-lg bg-gray-50 flex-1">
        <h5 className="font-medium text-gray-600 text-sm mb-2">{title}</h5>
        {data.length > 0 ? (
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-left text-gray-500">
                        <th>{type === 'Pace' ? 'Temp/Humidity' : 'Temp/Humidity'}</th>
                        <th>Avg {type}</th>
                        <th>Runs</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map(bucket => (
                        <tr key={bucket.label} className="border-t border-gray-200">
                            <td className="py-1">{bucket.label}</td>
                            <td className="py-1 font-semibold">
                                {type === 'Pace' ? formatPaceDisplay(bucket.avgPace) : formatHeartRateDisplay(bucket.avgHeartRate)}
                            </td>
                            <td className="py-1 text-gray-500">{bucket.runCount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        ) : <p className="text-xs text-gray-400">Not enough data for this analysis.</p>}
    </div>
);

export const PerformanceWeatherInsight: React.FC<PerformanceWeatherInsightProps> = ({ runs }) => {
  const tempPerformance = useMemo(() => getPerformanceByTemperature(runs), [runs]);
  const humidityPerformance = useMemo(() => getPerformanceByHumidity(runs), [runs]);

  const relevantRuns = runs.filter(r => r.weather_data?.temperature !== undefined || r.weather_data?.humidity !== undefined);

  if (relevantRuns.length < 3) { // Arbitrary threshold for meaningful insights
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">Performance vs. Weather</h3>
        <p className="text-gray-600">Not enough runs with weather data to generate insights. At least 3 runs with temperature/humidity data are needed.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Performance vs. Weather Conditions</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
         <DataTable title="Pace vs Temperature" data={tempPerformance} type="Pace" />
         <DataTable title="Heart Rate vs Temperature" data={tempPerformance} type="HR" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <DataTable title="Pace vs Humidity" data={humidityPerformance} type="Pace" />
         <DataTable title="Heart Rate vs Humidity" data={humidityPerformance} type="HR" />
      </div>
      <p className="text-xs text-gray-500 mt-4">
        This analysis compares your average pace and heart rate across different temperature and humidity ranges.
      </p>
    </div>
  );
};
