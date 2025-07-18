import { EnrichedRun } from '../../types';
import { 
  Goal, 
  GoalProgress
} from './goalTypes';
import { DataQualityFilter } from './dataQualityFilter';

export const calculateGoalProgress = (goal: Goal, runs: EnrichedRun[]): GoalProgress => {
  const now = new Date();
  const targetDate = new Date(goal.targetDate);
  const createdDate = new Date(goal.createdAt);
  
  const totalDays = Math.ceil((targetDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = totalDays - daysRemaining;
  
  let currentValue = 0;
  let progressPercentage = 0;
  let isOnTrack = false;
  let insights: string[] = [];
  let recommendations: string[] = [];

  // Simplified goal type calculations - only 3 types
  switch (goal.type) {
    case 'distance':
      currentValue = calculateDistanceGoal(goal, runs);
      break;
    case 'pace':
      currentValue = calculatePaceGoal(goal, runs);
      break;
    case 'runs':
      currentValue = calculateRunsGoal(goal, runs);
      break;
    default:
      currentValue = 0;
  }

  progressPercentage = Math.min(100, (currentValue / goal.targetValue) * 100);
  
  // Simple on-track calculation: are we at least 90% of where we should be?
  const expectedProgress = (daysElapsed / totalDays) * 100;
  isOnTrack = progressPercentage >= expectedProgress * 0.9;

  // Generate simple insights and recommendations
  insights = generateSimpleInsights(goal, currentValue, progressPercentage, isOnTrack, daysRemaining);
  recommendations = generateSimpleRecommendations(goal, currentValue, progressPercentage, isOnTrack, daysRemaining);

  // Calculate projected completion
  const currentRate = progressPercentage / Math.max(1, daysElapsed);
  const remainingProgress = 100 - progressPercentage;
  const projectedDaysToComplete = remainingProgress / Math.max(0.1, currentRate);
  const projectedCompletion = new Date(now.getTime() + projectedDaysToComplete * 24 * 60 * 60 * 1000).toISOString();

  return {
    goalId: goal.id,
    progressPercentage,
    isOnTrack,
    projectedCompletion,
    daysRemaining,
    milestones: [],
    insights,
    recommendations
  };
};

// Simplified goal calculation functions with data quality filtering
const calculateDistanceGoal = (goal: Goal, runs: EnrichedRun[]): number => {
  const targetDate = new Date(goal.targetDate);
  const createdDate = new Date(goal.createdAt);
  
  // Use DataQualityFilter to get clean, relevant runs
  const relevantRuns = DataQualityFilter.filterRunsByTimeframe(runs, createdDate, targetDate);
  const totalDistance = relevantRuns.reduce((total, run) => total + run.distance, 0);
  
  return totalDistance;
};

const calculateRunsGoal = (goal: Goal, runs: EnrichedRun[]): number => {
  const targetDate = new Date(goal.targetDate);
  const createdDate = new Date(goal.createdAt);
  
  // Use DataQualityFilter to get clean, relevant runs
  const relevantRuns = DataQualityFilter.filterRunsByTimeframe(runs, createdDate, targetDate);
  return relevantRuns.length; // number of valid runs
};

const calculatePaceGoal = (goal: Goal, runs: EnrichedRun[]): number => {
  // For pace goals, we need to find the best time for the target race distance
  if (!goal.raceDistance) return 0;
  
  // Use DataQualityFilter to get runs within distance tolerance (±10%)
  const relevantRuns = DataQualityFilter.filterRunsForPaceGoal(runs, goal.raceDistance, 0.1);
  
  if (relevantRuns.length === 0) return 0;
  
  // Find the best (fastest) time for this distance
  const bestTime = Math.min(...relevantRuns.map(run => run.moving_time));
  
  // Return the best time achieved (in seconds)
  return bestTime;
};

const generateSimpleInsights = (
  goal: Goal, 
  currentValue: number, 
  progressPercentage: number, 
  isOnTrack: boolean, 
  daysRemaining: number
): string[] => {
  const insights: string[] = [];
  
  if (progressPercentage >= 100) {
    insights.push(`🎉 Congratulations! You've achieved your ${goal.title} goal!`);
  } else if (isOnTrack) {
    insights.push(`✅ You're on track to achieve your ${goal.title} goal with ${daysRemaining} days remaining.`);
  } else {
    insights.push(`⚠️ You're behind schedule on your ${goal.title} goal. ${Math.round(100 - progressPercentage)}% remaining.`);
  }
  
  if (progressPercentage > 0 && progressPercentage < 100) {
    const rate = progressPercentage / Math.max(1, (new Date().getTime() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    insights.push(`📈 Current progress rate: ${rate.toFixed(1)}% per day`);
  }
  
  return insights;
};

const generateSimpleRecommendations = (
  goal: Goal, 
  currentValue: number, 
  progressPercentage: number, 
  isOnTrack: boolean, 
  daysRemaining: number
): string[] => {
  const recommendations: string[] = [];
  
  if (!isOnTrack && daysRemaining > 0) {
    const deficit = 100 - progressPercentage;
    const dailyTarget = deficit / daysRemaining;
    
    switch (goal.type) {
      case 'distance':
        const remainingDistance = (goal.targetValue - currentValue) / 1000;
        recommendations.push(`🏃‍♂️ Run ${(remainingDistance / daysRemaining).toFixed(1)}km per day to stay on track`);
        break;
      case 'runs':
        const remainingRuns = goal.targetValue - currentValue;
        const runsPerWeek = (remainingRuns / daysRemaining) * 7;
        recommendations.push(`📅 Aim for ${Math.ceil(runsPerWeek)} runs per week to stay on track`);
        break;
      case 'pace':
        recommendations.push(`⚡ Include speed work and tempo runs to improve pace`);
        break;
    }
  } else if (isOnTrack) {
    recommendations.push(`👍 Keep up your current training approach - you're doing great!`);
  }
  
  if (daysRemaining < 30 && progressPercentage < 80) {
    recommendations.push(`🚨 Consider adjusting your goal timeline or target to be more realistic`);
  }
  
  return recommendations;
};

// Helper functions can be added here as needed

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