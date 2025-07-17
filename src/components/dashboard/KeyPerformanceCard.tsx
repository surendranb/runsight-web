import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KeyPerformanceCardProps {
  metric: string;
  value: string;
  unit: string;
  trend: number; // Percentage change (positive = improvement, negative = decline)
  comparisonPeriod: string;
  previousValue: string;
}

export const KeyPerformanceCard: React.FC<KeyPerformanceCardProps> = ({
  metric,
  value,
  unit,
  trend,
  comparisonPeriod,
  previousValue
}) => {
  const isImprovement = trend < 0; // For pace, negative trend is improvement
  const trendPercentage = Math.abs(trend * 100);
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-600 mb-2">{metric}</h3>
        <div className="flex items-baseline justify-center space-x-2 mb-4">
          <span className="text-4xl font-bold text-gray-900">{value}</span>
          <span className="text-lg text-gray-500">{unit}</span>
        </div>
        
        <div className="flex items-center justify-center space-x-2 mb-2">
          {isImprovement ? (
            <TrendingDown className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingUp className="w-4 h-4 text-red-500" />
          )}
          <span className={`text-sm font-medium ${isImprovement ? 'text-green-600' : 'text-red-600'}`}>
            {trendPercentage.toFixed(1)}% {isImprovement ? 'faster' : 'slower'}
          </span>
        </div>
        
        <div className="text-xs text-gray-500">
          <span>vs {previousValue} {unit}</span>
          <br />
          <span>{comparisonPeriod}</span>
        </div>
      </div>
    </div>
  );
};