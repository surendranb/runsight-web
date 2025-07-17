// Goal system types and interfaces
export interface Goal {
  id: string;
  userId: string;
  type: 'distance' | 'race' | 'consistency' | 'pace';
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  targetDate: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'paused' | 'failed';
  priority: 'high' | 'medium' | 'low';
  category: 'annual' | 'monthly' | 'weekly' | 'race_specific';
}

export interface RaceGoal extends Goal {
  type: 'race';
  raceDetails: {
    name: string;
    distance: number; // in meters
    date: string;
    location?: string;
    targetTime: number; // in seconds
    currentPR?: number; // in seconds
  };
}

export interface DistanceGoal extends Goal {
  type: 'distance';
  distanceDetails: {
    totalTarget: number; // in meters
    timeframe: 'weekly' | 'monthly' | 'yearly';
    currentProgress: number;
  };
}

export interface ConsistencyGoal extends Goal {
  type: 'consistency';
  consistencyDetails: {
    runsPerWeek: number;
    minimumDistance?: number;
    streakTarget?: number;
    currentStreak: number;
  };
}

export interface PaceGoal extends Goal {
  type: 'pace';
  paceDetails: {
    targetPace: number; // seconds per km
    distance: number; // meters
    currentBestPace?: number;
    improvementTarget: number; // seconds improvement
  };
}

export interface GoalProgress {
  goalId: string;
  progressPercentage: number;
  isOnTrack: boolean;
  projectedCompletion: string;
  daysRemaining: number;
  milestones: Milestone[];
  insights: string[];
  recommendations: string[];
}

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  targetDate: string;
  targetValue: number;
  currentValue: number;
  isCompleted: boolean;
  completedAt?: string;
}

export interface AICoachingInsight {
  id: string;
  userId: string;
  type: 'goal_assessment' | 'training_recommendation' | 'progress_update' | 'motivation';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
  relatedGoalIds: string[];
  createdAt: string;
  expiresAt?: string;
  isRead: boolean;
}

export interface TrainingPlan {
  id: string;
  userId: string;
  goalIds: string[];
  title: string;
  description: string;
  duration: number; // weeks
  startDate: string;
  endDate: string;
  weeklyStructure: {
    totalRuns: number;
    easyRuns: number;
    tempoRuns: number;
    intervalRuns: number;
    longRuns: number;
    restDays: number;
  };
  weeklyPlans: WeeklyPlan[];
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyPlan {
  week: number;
  totalDistance: number;
  workouts: WorkoutPlan[];
  focus: string;
  notes?: string;
}

export interface WorkoutPlan {
  day: number; // 1-7 (Monday-Sunday)
  type: 'easy' | 'tempo' | 'intervals' | 'long' | 'rest' | 'cross_training';
  distance?: number;
  duration?: number;
  intensity: 'recovery' | 'easy' | 'moderate' | 'hard' | 'very_hard';
  description: string;
  paceTarget?: number;
  completed?: boolean;
  completedAt?: string;
}

export interface GoalAnalysis {
  feasibility: 'realistic' | 'challenging' | 'ambitious' | 'unrealistic';
  successProbability: number; // 0-100
  requiredImprovement: number;
  timelineAssessment: string;
  risks: string[];
  recommendations: string[];
  milestones: {
    date: string;
    target: number;
    description: string;
  }[];
}

// Utility types for API responses
export interface CreateGoalRequest {
  type: Goal['type'];
  title: string;
  description?: string;
  targetValue: number;
  unit: string;
  targetDate: string;
  priority?: Goal['priority'];
  category?: Goal['category'];
  additionalDetails?: any;
}

export interface UpdateGoalRequest {
  title?: string;
  description?: string;
  targetValue?: number;
  targetDate?: string;
  status?: Goal['status'];
  priority?: Goal['priority'];
}

export interface GoalProgressUpdate {
  currentValue: number;
  notes?: string;
  milestoneCompleted?: string;
}