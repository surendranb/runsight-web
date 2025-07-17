import React, { useState, useEffect } from 'react';
import { Target, Plus, TrendingUp, Calendar, Award } from 'lucide-react';
import { EnrichedRun } from '../../types';
import { Goal, GoalProgress as GoalProgressType } from '../../lib/goals/goalTypes';
import { calculateGoalProgress, getGoalStatusColor } from '../../lib/goals/goalUtils';

interface GoalProgressProps {
  runs: EnrichedRun[];
  onCreateGoal?: () => void;
}

// Mock goals for demonstration - in real app these would come from database
const mockGoals: Goal[] = [
  {
    id: '1',
    userId: 'user1',
    type: 'distance',
    title: '1000km in 2025',
    description: 'Run 1000 kilometers throughout the year',
    targetValue: 1000000, // in meters
    currentValue: 0,
    unit: 'meters',
    targetDate: '2025-12-31',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    status: 'active',
    priority: 'high',
    category: 'annual'
  }
];

export const GoalProgress: React.FC<GoalProgressProps> = ({ runs, onCreateGoal }) => {
  const [goals] = useState<Goal[]>(mockGoals);
  const [goalProgress, setGoalProgress] = useState<Map<string, GoalProgressType>>(new Map());

  useEffect(() => {
    // Calculate progress for each goal
    const progressMap = new Map<string, GoalProgressType>();
    goals.forEach(goal => {
      const progress = calculateGoalProgress(goal, runs);
      progressMap.set(goal.id, progress);
    });
    setGoalProgress(progressMap);
  }, [goals, runs]);

  const formatValue = (value: number, unit: string): string => {
    switch (unit) {
      case 'meters':
        return `${(value / 1000).toFixed(1)}km`;
      case 'runs/week':
        return `${value.toFixed(1)} runs/week`;
      case 'seconds':
        const minutes = Math.floor(value / 60);
        const seconds = Math.floor(value % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      default:
        return value.toString();
    }
  };

  const getProgressColor = (percentage: number, isOnTrack: boolean): string => {
    if (percentage >= 100) return 'bg-green-500';
    if (isOnTrack) return 'bg-blue-500';
    return 'bg-orange-500';
  };

  if (goals.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Target className="w-6 h-6 text-blue-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-800">Goals</h3>
          </div>
          <button
            onClick={onCreateGoal}
            className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" />
            Set Goal
          </button>
        </div>
        
        <div className="text-center py-8 text-gray-500">
          <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No goals set yet.</p>
          <p className="text-sm">Set your first running goal to track progress!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Target className="w-6 h-6 text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">Goal Progress</h3>
        </div>
        <button
          onClick={onCreateGoal}
          className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Goal
        </button>
      </div>

      <div className="space-y-4">
        {goals.map(goal => {
          const progress = goalProgress.get(goal.id);
          if (!progress) return null;

          const currentFormatted = formatValue(progress.progressPercentage * goal.targetValue / 100, goal.unit);
          const targetFormatted = formatValue(goal.targetValue, goal.unit);

          return (
            <div key={goal.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{goal.title}</h4>
                  <p className="text-sm text-gray-600">{goal.description}</p>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getGoalStatusColor(goal, progress)}`}>
                    {goal.status}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {progress.daysRemaining > 0 ? `${progress.daysRemaining} days left` : 'Overdue'}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>{currentFormatted}</span>
                  <span>{targetFormatted}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress.progressPercentage, progress.isOnTrack)}`}
                    style={{ width: `${Math.min(100, progress.progressPercentage)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{progress.progressPercentage.toFixed(1)}% complete</span>
                  <span className={progress.isOnTrack ? 'text-green-600' : 'text-orange-600'}>
                    {progress.isOnTrack ? '✓ On track' : '⚠ Behind'}
                  </span>
                </div>
              </div>

              {/* Insights */}
              {progress.insights.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">Latest Insight:</div>
                  <div className="text-sm text-gray-700 bg-blue-50 p-2 rounded">
                    {progress.insights[0]}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center text-gray-500">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(goal.targetDate).toLocaleDateString()}
                  </span>
                  <span className="flex items-center text-gray-500">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {goal.priority} priority
                  </span>
                </div>
                <button className="text-blue-500 hover:text-blue-700">
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">
              {goals.filter(g => goalProgress.get(g.id)?.isOnTrack).length}
            </div>
            <div className="text-xs text-gray-500">On Track</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">
              {goals.filter(g => g.status === 'completed').length}
            </div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">
              {Math.round(Array.from(goalProgress.values()).reduce((sum, p) => sum + p.progressPercentage, 0) / goals.length)}%
            </div>
            <div className="text-xs text-gray-500">Avg Progress</div>
          </div>
        </div>
      </div>
    </div>
  );
};