import React from 'react';
import { Target, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface GoalProgressProps {
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline?: string;
  onTrack?: boolean;
}

export const GoalProgress: React.FC<GoalProgressProps> = ({
  title,
  target,
  current,
  unit,
  deadline,
  onTrack
}) => {
  const percentage = Math.min((current / target) * 100, 100);
  const remaining = Math.max(target - current, 0);
  
  // Calculate if on track based on time remaining
  const getTrackingStatus = () => {
    if (!deadline) return null;
    
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const totalDays = Math.ceil((deadlineDate.getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const expectedProgress = ((totalDays - remainingDays) / totalDays) * 100;
    
    return {
      expectedProgress,
      remainingDays,
      isOnTrack: percentage >= expectedProgress * 0.9 // 10% tolerance
    };
  };
  
  const trackingStatus = getTrackingStatus();
  const isOnTrack = onTrack ?? trackingStatus?.isOnTrack ?? true;
  
  const getProgressColor = () => {
    if (percentage >= 100) return 'bg-green-500';
    if (isOnTrack) return 'bg-blue-500';
    return 'bg-yellow-500';
  };
  
  const getStatusColor = () => {
    if (percentage >= 100) return 'text-green-600';
    if (isOnTrack) return 'text-blue-600';
    return 'text-yellow-600';
  };
  
  const formatDeadline = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays < 30) return `${diffDays} days left`;
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} left`;
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-purple-100 rounded-full">
            <Target className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="font-medium text-gray-900">{title}</h3>
        </div>
        
        <div className="flex items-center space-x-1">
          {percentage >= 100 ? (
            <div className="flex items-center text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Complete!</span>
            </div>
          ) : isOnTrack ? (
            <div className="flex items-center text-blue-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">On track</span>
            </div>
          ) : (
            <div className="flex items-center text-yellow-600">
              <TrendingDown className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Behind</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-gray-900">{current.toLocaleString()}</span>
            <span className="text-sm text-gray-500">/ {target.toLocaleString()} {unit}</span>
          </div>
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {percentage.toFixed(1)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ease-out ${getProgressColor()}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
          {trackingStatus && trackingStatus.expectedProgress > percentage && (
            <div 
              className="absolute h-3 border-r-2 border-gray-400 opacity-50"
              style={{ 
                left: `${Math.min(trackingStatus.expectedProgress, 100)}%`,
                marginTop: '-12px'
              }}
              title="Expected progress"
            />
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>
          <span className="font-medium">{remaining.toLocaleString()} {unit}</span>
          <span> remaining</span>
        </div>
        
        {deadline && (
          <div className="flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            <span>{formatDeadline(deadline)}</span>
          </div>
        )}
      </div>
      
      {trackingStatus && trackingStatus.remainingDays > 0 && remaining > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            <span className="font-medium">
              {(remaining / trackingStatus.remainingDays).toFixed(1)} {unit}/day
            </span>
            <span> needed to reach goal</span>
          </div>
        </div>
      )}
    </div>
  );
};