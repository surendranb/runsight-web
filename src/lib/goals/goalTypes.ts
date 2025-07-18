// Simplified Goal system - Only 3 types: distance, pace, runs
export interface Goal {
  id: string;
  userId: string;
  type: 'distance' | 'pace' | 'runs';
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
  
  // Additional details for specific goal types
  raceDistance?: number; // For pace goals (5000, 10000, 21097, 42195 meters)
  timeframe?: 'weekly' | 'monthly' | 'yearly'; // For runs goals
}

// Distance Goal: Total distance to run (e.g., 1000km in 2025)
export interface DistanceGoal extends Goal {
  type: 'distance';
  unit: 'meters';
  targetValue: number; // total meters to run
}

// Pace Goal: Target time for specific race distance (e.g., 5K under 25 minutes)
export interface PaceGoal extends Goal {
  type: 'pace';
  unit: 'seconds';
  targetValue: number; // target time in seconds
  raceDistance: number; // race distance in meters (5000, 10000, 21097, 42195)
}

// Runs Goal: Number of runs to complete (e.g., 100 runs this year)
export interface RunsGoal extends Goal {
  type: 'runs';
  unit: 'runs';
  targetValue: number; // number of runs
  timeframe: 'weekly' | 'monthly' | 'yearly';
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
  additionalDetails?: {
    raceDistance?: number;
    timeframe?: 'weekly' | 'monthly' | 'yearly';
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  };
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