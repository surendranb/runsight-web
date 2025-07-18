import { EnrichedRun } from '../../types';
import { 
  Goal, 
  GoalProgress
} from './goalTypes';
import { GoalCalculator } from './goalCalculator';

// Main export - use the robust GoalCalculator
export const calculateGoalProgress = (goal: Goal, runs: EnrichedRun[]): GoalProgress => {
  return GoalCalculator.calculateGoalProgress(goal, runs);
};

// Validation utility
export const validateGoal = (goal: Goal) => {
  return GoalCalculator.validateGoal(goal);
};

// Helper functions for goal display and formatting

export const formatGoalProgress = (progress: GoalProgress): string => {
  return `${progress.progressPercentage.toFixed(1)}% complete`;
};

export const getGoalStatusColor = (goal: Goal, progress: GoalProgress): string => {
  if (goal.status === 'completed') return 'text-green-600 bg-green-100';
  if (goal.status === 'failed') return 'text-red-600 bg-red-100';
  if (goal.status === 'paused') return 'text-gray-600 bg-gray-100';
  
  if (progress.isOnTrack) return 'text-blue-600 bg-blue-100';
  return 'text-orange-600 bg-orange-100';
};