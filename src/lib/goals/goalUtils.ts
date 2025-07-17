import { EnrichedRun } from '../../types';
import { 
  Goal, 
  GoalProgress, 
  GoalAnalysis, 
  Milestone,
  RaceGoal,
  DistanceGoal,
  ConsistencyGoal,
  PaceGoal
} from './goalTypes';

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

  switch (goal.type) {
    case 'distance':
      currentValue = calculateDistanceProgress(goal as DistanceGoal, runs);
      break;
    case 'race':
      currentValue = calculateRaceProgress(goal as RaceGoal, runs);
      break;
    case 'consistency':
      currentValue = calculateConsistencyProgress(goal as ConsistencyGoal, runs);
      break;
    case 'pace':
      currentValue = calculatePaceProgress(goal as PaceGoal, runs);
      break;
  }

  progressPercentage = Math.min(100, (currentValue / goal.targetValue) * 100);
  
  // Calculate if on track (simple linear projection)
  const expectedProgress = (daysElapsed / totalDays) * 100;
  isOnTrack = progressPercentage >= expectedProgress * 0.9; // 10% tolerance

  // Generate insights and recommendations
  insights = generateProgressInsights(goal, currentValue, progressPercentage, isOnTrack, daysRemaining);
  recommendations = generateRecommendations(goal, currentValue, progressPercentage, isOnTrack, daysRemaining);

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
    milestones: generateMilestones(goal),
    insights,
    recommendations
  };
};

const calculateDistanceProgress = (goal: DistanceGoal, runs: EnrichedRun[]): number => {
  const targetDate = new Date(goal.targetDate);
  const createdDate = new Date(goal.createdAt);
  
  const relevantRuns = runs.filter(run => {
    const runDate = new Date(run.start_date_local || run.start_date);
    return runDate >= createdDate && runDate <= targetDate;
  });

  console.log(`[calculateDistanceProgress] Goal: ${goal.title}`);
  console.log(`[calculateDistanceProgress] Date range: ${createdDate.toISOString()} to ${targetDate.toISOString()}`);
  console.log(`[calculateDistanceProgress] Total runs: ${runs.length}, Relevant runs: ${relevantRuns.length}`);
  
  const totalDistance = relevantRuns.reduce((total, run) => total + run.distance, 0);
  console.log(`[calculateDistanceProgress] Total distance: ${totalDistance}m (${(totalDistance/1000).toFixed(1)}km)`);
  
  return totalDistance;
};

const calculateRaceProgress = (goal: RaceGoal, runs: EnrichedRun[]): number => {
  const raceDistance = goal.raceDetails.distance;
  const targetTime = goal.raceDetails.targetTime;
  
  // Find runs of similar distance (within 20% of race distance)
  const similarRuns = runs.filter(run => 
    Math.abs(run.distance - raceDistance) <= raceDistance * 0.2
  );

  if (similarRuns.length === 0) return 0;

  // Get best time for similar distance
  const bestTime = Math.min(...similarRuns.map(run => run.moving_time));
  
  // Calculate progress as improvement toward target
  const currentPR = goal.raceDetails.currentPR || bestTime;
  const improvementNeeded = currentPR - targetTime;
  const improvementMade = currentPR - bestTime;
  
  if (improvementNeeded <= 0) return 100; // Already achieved target
  
  return Math.max(0, Math.min(100, (improvementMade / improvementNeeded) * 100));
};

const calculateConsistencyProgress = (goal: ConsistencyGoal, runs: EnrichedRun[]): number => {
  // Defensive programming: check if consistencyDetails exists
  if (!goal.consistencyDetails || typeof goal.consistencyDetails.runsPerWeek !== 'number') {
    console.warn('ConsistencyGoal missing consistencyDetails, returning 0 progress');
    return 0;
  }

  const targetDate = new Date(goal.targetDate);
  const createdDate = new Date(goal.createdAt);
  const now = new Date();
  
  const weeksElapsed = Math.ceil((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
  
  if (weeksElapsed === 0) return 0;
  
  const relevantRuns = runs.filter(run => {
    const runDate = new Date(run.start_date_local || run.start_date);
    return runDate >= createdDate && runDate <= now;
  });

  // Group runs by week
  const runsByWeek = new Map<string, EnrichedRun[]>();
  relevantRuns.forEach(run => {
    const runDate = new Date(run.start_date_local || run.start_date);
    const weekKey = getWeekKey(runDate);
    if (!runsByWeek.has(weekKey)) {
      runsByWeek.set(weekKey, []);
    }
    runsByWeek.get(weekKey)!.push(run);
  });

  // Calculate weeks that met the goal
  const targetRunsPerWeek = goal.consistencyDetails.runsPerWeek;
  const successfulWeeks = Array.from(runsByWeek.values()).filter(
    weekRuns => weekRuns.length >= targetRunsPerWeek
  ).length;

  return Math.min(100, (successfulWeeks / weeksElapsed) * 100);
};

const calculatePaceProgress = (goal: PaceGoal, runs: EnrichedRun[]): number => {
  const targetDistance = goal.paceDetails.distance;
  const targetPace = goal.paceDetails.targetPace;
  
  // Find runs of similar distance
  const similarRuns = runs.filter(run => 
    Math.abs(run.distance - targetDistance) <= targetDistance * 0.1
  );

  if (similarRuns.length === 0) return 0;

  // Get best pace for similar distance
  const bestPace = Math.min(...similarRuns.map(run => run.moving_time / (run.distance / 1000)));
  
  if (bestPace <= targetPace) return 100; // Already achieved target
  
  const currentBest = goal.paceDetails.currentBestPace || bestPace;
  const improvementNeeded = currentBest - targetPace;
  const improvementMade = currentBest - bestPace;
  
  return Math.max(0, Math.min(100, (improvementMade / improvementNeeded) * 100));
};

const generateProgressInsights = (
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

const generateRecommendations = (
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
      case 'consistency':
        recommendations.push(`📅 Focus on maintaining ${(goal as ConsistencyGoal).consistencyDetails.runsPerWeek} runs per week`);
        break;
      case 'pace':
        recommendations.push(`⚡ Include speed work and tempo runs to improve pace`);
        break;
      case 'race':
        recommendations.push(`🏁 Follow a structured training plan for your race distance`);
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

const generateMilestones = (goal: Goal): Milestone[] => {
  const milestones: Milestone[] = [];
  const startDate = new Date(goal.createdAt);
  const endDate = new Date(goal.targetDate);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Create quarterly milestones
  const milestoneCount = Math.min(4, Math.max(2, Math.floor(totalDays / 30)));
  
  for (let i = 1; i <= milestoneCount; i++) {
    const milestoneDate = new Date(startDate.getTime() + (totalDays / milestoneCount) * i * 24 * 60 * 60 * 1000);
    const targetValue = (goal.targetValue / milestoneCount) * i;
    
    milestones.push({
      id: `${goal.id}-milestone-${i}`,
      goalId: goal.id,
      title: `${Math.round((i / milestoneCount) * 100)}% Milestone`,
      targetDate: milestoneDate.toISOString(),
      targetValue,
      currentValue: 0, // Will be calculated separately
      isCompleted: false
    });
  }
  
  return milestones;
};

export const analyzeGoalFeasibility = (
  goal: Goal, 
  runs: EnrichedRun[], 
  userStats: any
): GoalAnalysis => {
  const analysis: GoalAnalysis = {
    feasibility: 'realistic',
    successProbability: 75,
    requiredImprovement: 0,
    timelineAssessment: '',
    risks: [],
    recommendations: [],
    milestones: []
  };

  // Analyze based on goal type and historical performance
  switch (goal.type) {
    case 'distance':
      return analyzeDistanceGoalFeasibility(goal as DistanceGoal, runs, userStats);
    case 'race':
      return analyzeRaceGoalFeasibility(goal as RaceGoal, runs, userStats);
    case 'consistency':
      return analyzeConsistencyGoalFeasibility(goal as ConsistencyGoal, runs, userStats);
    case 'pace':
      return analyzePaceGoalFeasibility(goal as PaceGoal, runs, userStats);
    default:
      return analysis;
  }
};

const analyzeDistanceGoalFeasibility = (goal: DistanceGoal, runs: EnrichedRun[], userStats: any): GoalAnalysis => {
  const recentMonthlyDistance = calculateRecentMonthlyDistance(runs);
  const targetMonthlyDistance = goal.targetValue / 12; // Assuming yearly goal
  
  const improvementRequired = (targetMonthlyDistance - recentMonthlyDistance) / recentMonthlyDistance;
  
  let feasibility: GoalAnalysis['feasibility'] = 'realistic';
  let successProbability = 80;
  
  if (improvementRequired > 1) {
    feasibility = 'unrealistic';
    successProbability = 20;
  } else if (improvementRequired > 0.5) {
    feasibility = 'ambitious';
    successProbability = 50;
  } else if (improvementRequired > 0.2) {
    feasibility = 'challenging';
    successProbability = 70;
  }

  return {
    feasibility,
    successProbability,
    requiredImprovement: improvementRequired * 100,
    timelineAssessment: `Requires ${improvementRequired > 0 ? 'increasing' : 'maintaining'} monthly distance`,
    risks: improvementRequired > 0.3 ? ['Risk of overtraining', 'Injury risk from rapid increase'] : [],
    recommendations: [
      'Gradually increase weekly mileage by 10%',
      'Include rest days for recovery',
      'Monitor for signs of overtraining'
    ],
    milestones: generateDistanceMilestones(goal)
  };
};

const analyzeRaceGoalFeasibility = (goal: RaceGoal, runs: EnrichedRun[], userStats: any): GoalAnalysis => {
  // Implementation for race goal analysis
  return {
    feasibility: 'challenging',
    successProbability: 65,
    requiredImprovement: 15,
    timelineAssessment: 'Achievable with focused training',
    risks: ['Weather conditions on race day', 'Potential for injury'],
    recommendations: ['Follow structured training plan', 'Practice race pace', 'Taper properly'],
    milestones: []
  };
};

const analyzeConsistencyGoalFeasibility = (goal: ConsistencyGoal, runs: EnrichedRun[], userStats: any): GoalAnalysis => {
  // Implementation for consistency goal analysis
  return {
    feasibility: 'realistic',
    successProbability: 85,
    requiredImprovement: 10,
    timelineAssessment: 'Very achievable with discipline',
    risks: ['Schedule conflicts', 'Motivation challenges'],
    recommendations: ['Set consistent running schedule', 'Find accountability partner'],
    milestones: []
  };
};

const analyzePaceGoalFeasibility = (goal: PaceGoal, runs: EnrichedRun[], userStats: any): GoalAnalysis => {
  // Implementation for pace goal analysis
  return {
    feasibility: 'challenging',
    successProbability: 60,
    requiredImprovement: 20,
    timelineAssessment: 'Requires focused speed work',
    risks: ['Overtraining from intensity', 'Plateau in improvement'],
    recommendations: ['Include interval training', 'Work with coach', 'Monitor recovery'],
    milestones: []
  };
};

// Helper functions
const getWeekKey = (date: Date): string => {
  const year = date.getFullYear();
  const week = Math.ceil(((date.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7);
  return `${year}-W${week}`;
};

const calculateRecentMonthlyDistance = (runs: EnrichedRun[]): number => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentRuns = runs.filter(run => new Date(run.start_date_local || run.start_date) >= thirtyDaysAgo);
  return recentRuns.reduce((total, run) => total + run.distance, 0);
};

const generateDistanceMilestones = (goal: DistanceGoal): any[] => {
  // Implementation for generating distance milestones
  return [];
};

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