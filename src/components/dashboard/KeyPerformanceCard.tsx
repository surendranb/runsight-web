import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, HelpCircle, ChevronRight } from 'lucide-react';

interface KeyPerformanceCardProps {
  metric: string;
  value: string;
  unit: string;
  trend: number; // Percentage change (positive = improvement, negative = decline)
  comparisonPeriod: string;
  previousValue: string;
  contextTooltip: string; // Explanation of what this metric means for the user
  trendDirection: 'up' | 'down' | 'stable'; // Clear visual hierarchy for trend
  priority: 'primary' | 'secondary'; // Visual emphasis level
  onViewDetails?: () => void; // Progressive disclosure trigger
}

export const KeyPerformanceCard: React.FC<KeyPerformanceCardProps> = ({
  metric,
  value,
  unit,
  trend,
  comparisonPeriod,
  previousValue,
  contextTooltip,
  trendDirection,
  priority = 'secondary',
  onViewDetails
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const trendPercentage = Math.abs(trend * 100);
  
  // Determine trend colors and icons based on direction
  const getTrendDisplay = () => {
    switch (trendDirection) {
      case 'up':
        return {
          icon: <TrendingUp className="w-5 h-5 text-green-500" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          text: 'improved'
        };
      case 'down':
        return {
          icon: <TrendingDown className="w-5 h-5 text-red-500" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          text: 'declined'
        };
      case 'stable':
        return {
          icon: <Minus className="w-5 h-5 text-gray-500" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          text: 'stable'
        };
    }
  };

  const trendDisplay = getTrendDisplay();
  
  // Primary cards get enhanced visual hierarchy
  const cardClasses = priority === 'primary' 
    ? "bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg border-2 border-blue-200 p-6 hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
    : "bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all duration-200";

  const valueClasses = priority === 'primary'
    ? "text-5xl font-bold text-gray-900"
    : "text-4xl font-bold text-gray-900";

  return (
    <div className={cardClasses}>
      {/* Priority indicator for primary cards */}
      {priority === 'primary' && (
        <div className="flex justify-center mb-3">
          <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            Key Metric
          </span>
        </div>
      )}

      <div className="text-center">
        {/* Metric title with context tooltip */}
        <div className="flex items-center justify-center space-x-2 mb-3">
          <h3 className={`font-semibold ${priority === 'primary' ? 'text-xl text-gray-800' : 'text-lg text-gray-700'}`}>
            {metric}
          </h3>
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={`Information about ${metric}`}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            
            {/* Context tooltip */}
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                <div className="relative">
                  {contextTooltip}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Main value display */}
        <div className="flex items-baseline justify-center space-x-2 mb-4">
          <span className={valueClasses}>{value}</span>
          <span className={`${priority === 'primary' ? 'text-xl' : 'text-lg'} text-gray-600`}>{unit}</span>
        </div>
        
        {/* Trend indicator with clear visual hierarchy */}
        {trendDirection !== 'stable' && trendPercentage > 0 && (
          <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg ${trendDisplay.bgColor} ${trendDisplay.borderColor} border mb-3`}>
            {trendDisplay.icon}
            <span className={`text-sm font-medium ${trendDisplay.color}`}>
              {trendPercentage.toFixed(1)}% {trendDisplay.text}
            </span>
          </div>
        )}
        
        {trendDirection === 'stable' && (
          <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg ${trendDisplay.bgColor} ${trendDisplay.borderColor} border mb-3`}>
            {trendDisplay.icon}
            <span className={`text-sm font-medium ${trendDisplay.color}`}>
              Consistent performance
            </span>
          </div>
        )}
        
        {/* Comparison context */}
        <div className="text-xs text-gray-500 mb-4">
          <span>vs {previousValue} {unit}</span>
          <br />
          <span>{comparisonPeriod}</span>
        </div>

        {/* Progressive disclosure trigger */}
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors group"
          >
            <span>View Details</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
};