// Goal Templates - Pre-defined popular running goals
import { CreateGoalRequest } from './goalTypes';

export interface GoalTemplate {
  id: string;
  category: 'distance' | 'pace' | 'frequency' | 'time';
  title: string;
  description: string;
  targetValue: number;
  unit: string;
  timeframe: 'monthly' | 'annual' | 'race_specific';
  priority: 'high' | 'medium' | 'low';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTimeCommitment: string; // e.g., "3-4 hours/week"
  
  // Additional fields for specific goal types
  raceDistance?: number; // For pace goals
  raceType?: string; // For frequency goals
  runsPerWeek?: number; // For time goals
}

// Distance Goal Templates
export const DISTANCE_TEMPLATES: GoalTemplate[] = [
  {
    id: 'distance-1000km-annual',
    category: 'distance',
    title: '1000km in 2025',
    description: 'Run 1000 kilometers throughout the year - a classic annual distance goal',
    targetValue: 1000000, // meters
    unit: 'meters',
    timeframe: 'annual',
    priority: 'medium',
    difficulty: 'intermediate',
    estimatedTimeCommitment: '4-5 hours/week'
  },
  {
    id: 'distance-2500km-annual',
    category: 'distance',
    title: '2500km in 2025',
    description: 'Challenge yourself with 2500 kilometers in a year - for serious runners',
    targetValue: 2500000, // meters
    unit: 'meters',
    timeframe: 'annual',
    priority: 'high',
    difficulty: 'advanced',
    estimatedTimeCommitment: '8-10 hours/week'
  },
  {
    id: 'distance-500km-annual',
    category: 'distance',
    title: '500km in 2025',
    description: 'A great starting goal for new runners - 500km throughout the year',
    targetValue: 500000, // meters
    unit: 'meters',
    timeframe: 'annual',
    priority: 'medium',
    difficulty: 'beginner',
    estimatedTimeCommitment: '2-3 hours/week'
  },
  {
    id: 'distance-100km-monthly',
    category: 'distance',
    title: '100km this month',
    description: 'Run 100 kilometers in a single month',
    targetValue: 100000, // meters
    unit: 'meters',
    timeframe: 'monthly',
    priority: 'medium',
    difficulty: 'intermediate',
    estimatedTimeCommitment: '4-5 hours/week'
  },
  {
    id: 'distance-200km-monthly',
    category: 'distance',
    title: '200km this month',
    description: 'Challenge yourself with 200km in one month',
    targetValue: 200000, // meters
    unit: 'meters',
    timeframe: 'monthly',
    priority: 'high',
    difficulty: 'advanced',
    estimatedTimeCommitment: '8-10 hours/week'
  }
];

// Pace Goal Templates
export const PACE_TEMPLATES: GoalTemplate[] = [
  {
    id: 'pace-5k-30min',
    category: 'pace',
    title: '5K under 30 minutes',
    description: 'Break the 30-minute barrier for a 5K race - a popular milestone',
    targetValue: 1800, // seconds (30 minutes)
    unit: 'seconds',
    timeframe: 'race_specific',
    priority: 'high',
    difficulty: 'beginner',
    estimatedTimeCommitment: '3-4 hours/week',
    raceDistance: 5000 // meters
  },
  {
    id: 'pace-5k-25min',
    category: 'pace',
    title: '5K under 25 minutes',
    description: 'Achieve a sub-25 minute 5K - a solid intermediate goal',
    targetValue: 1500, // seconds (25 minutes)
    unit: 'seconds',
    timeframe: 'race_specific',
    priority: 'high',
    difficulty: 'intermediate',
    estimatedTimeCommitment: '4-5 hours/week',
    raceDistance: 5000
  },
  {
    id: 'pace-5k-20min',
    category: 'pace',
    title: '5K under 20 minutes',
    description: 'Elite level 5K time - sub-20 minutes is a serious achievement',
    targetValue: 1200, // seconds (20 minutes)
    unit: 'seconds',
    timeframe: 'race_specific',
    priority: 'high',
    difficulty: 'advanced',
    estimatedTimeCommitment: '6-8 hours/week',
    raceDistance: 5000
  },
  {
    id: 'pace-10k-60min',
    category: 'pace',
    title: '10K under 60 minutes',
    description: 'Break the hour mark for a 10K race',
    targetValue: 3600, // seconds (60 minutes)
    unit: 'seconds',
    timeframe: 'race_specific',
    priority: 'medium',
    difficulty: 'beginner',
    estimatedTimeCommitment: '3-4 hours/week',
    raceDistance: 10000
  },
  {
    id: 'pace-10k-50min',
    category: 'pace',
    title: '10K under 50 minutes',
    description: 'Achieve a sub-50 minute 10K - a solid intermediate target',
    targetValue: 3000, // seconds (50 minutes)
    unit: 'seconds',
    timeframe: 'race_specific',
    priority: 'high',
    difficulty: 'intermediate',
    estimatedTimeCommitment: '4-6 hours/week',
    raceDistance: 10000
  },
  {
    id: 'pace-half-2hours',
    category: 'pace',
    title: 'Half Marathon under 2 hours',
    description: 'Break the 2-hour barrier for a half marathon',
    targetValue: 7200, // seconds (2 hours)
    unit: 'seconds',
    timeframe: 'race_specific',
    priority: 'high',
    difficulty: 'intermediate',
    estimatedTimeCommitment: '5-7 hours/week',
    raceDistance: 21097
  },
  {
    id: 'pace-marathon-4hours',
    category: 'pace',
    title: 'Marathon under 4 hours',
    description: 'Achieve a sub-4 hour marathon - a classic milestone',
    targetValue: 14400, // seconds (4 hours)
    unit: 'seconds',
    timeframe: 'race_specific',
    priority: 'high',
    difficulty: 'advanced',
    estimatedTimeCommitment: '8-12 hours/week',
    raceDistance: 42195
  }
];

// Frequency Goal Templates
export const FREQUENCY_TEMPLATES: GoalTemplate[] = [
  {
    id: 'frequency-20-half-marathons',
    category: 'frequency',
    title: '20 half marathons this year',
    description: 'Complete 20 half marathon races in a single year',
    targetValue: 20,
    unit: 'races',
    timeframe: 'annual',
    priority: 'high',
    difficulty: 'advanced',
    estimatedTimeCommitment: '8-10 hours/week',
    raceType: 'half_marathon'
  },
  {
    id: 'frequency-12-races',
    category: 'frequency',
    title: '12 races this year',
    description: 'Participate in 12 races of any distance throughout the year',
    targetValue: 12,
    unit: 'races',
    timeframe: 'annual',
    priority: 'medium',
    difficulty: 'intermediate',
    estimatedTimeCommitment: '4-6 hours/week',
    raceType: 'any'
  },
  {
    id: 'frequency-4-marathons',
    category: 'frequency',
    title: '4 marathons this year',
    description: 'Complete 4 full marathons in a single year',
    targetValue: 4,
    unit: 'races',
    timeframe: 'annual',
    priority: 'high',
    difficulty: 'advanced',
    estimatedTimeCommitment: '10-15 hours/week',
    raceType: 'marathon'
  },
  {
    id: 'frequency-6-10k-races',
    category: 'frequency',
    title: '6 x 10K races this year',
    description: 'Participate in 6 different 10K races throughout the year',
    targetValue: 6,
    unit: 'races',
    timeframe: 'annual',
    priority: 'medium',
    difficulty: 'intermediate',
    estimatedTimeCommitment: '3-5 hours/week',
    raceType: '10k'
  },
  {
    id: 'frequency-monthly-5k',
    category: 'frequency',
    title: 'Monthly 5K races',
    description: 'Participate in at least one 5K race every month',
    targetValue: 12,
    unit: 'races',
    timeframe: 'annual',
    priority: 'medium',
    difficulty: 'beginner',
    estimatedTimeCommitment: '2-4 hours/week',
    raceType: '5k'
  }
];

// Time Goal Templates (running time-based goals)
export const TIME_TEMPLATES: GoalTemplate[] = [
  {
    id: 'time-100-hours-annual',
    category: 'time',
    title: '100 hours of running in 2025',
    description: 'Spend 100 hours running throughout the year',
    targetValue: 360000, // seconds (100 hours)
    unit: 'seconds',
    timeframe: 'annual',
    priority: 'medium',
    difficulty: 'intermediate',
    estimatedTimeCommitment: '2-3 hours/week'
  },
  {
    id: 'time-200-hours-annual',
    category: 'time',
    title: '200 hours of running in 2025',
    description: 'Dedicate 200 hours to running this year - for serious runners',
    targetValue: 720000, // seconds (200 hours)
    unit: 'seconds',
    timeframe: 'annual',
    priority: 'high',
    difficulty: 'advanced',
    estimatedTimeCommitment: '4-5 hours/week'
  },
  {
    id: 'time-50-hours-annual',
    category: 'time',
    title: '50 hours of running in 2025',
    description: 'A great starting goal - 50 hours of running throughout the year',
    targetValue: 180000, // seconds (50 hours)
    unit: 'seconds',
    timeframe: 'annual',
    priority: 'medium',
    difficulty: 'beginner',
    estimatedTimeCommitment: '1-2 hours/week'
  },
  {
    id: 'time-10-hours-monthly',
    category: 'time',
    title: '10 hours this month',
    description: 'Run for 10 hours in a single month',
    targetValue: 36000, // seconds (10 hours)
    unit: 'seconds',
    timeframe: 'monthly',
    priority: 'medium',
    difficulty: 'intermediate',
    estimatedTimeCommitment: '2-3 hours/week'
  }
];

// Combined templates for easy access
export const ALL_TEMPLATES: GoalTemplate[] = [
  ...DISTANCE_TEMPLATES,
  ...PACE_TEMPLATES,
  ...FREQUENCY_TEMPLATES,
  ...TIME_TEMPLATES
];

// Helper functions
export const getTemplatesByCategory = (category: GoalTemplate['category']): GoalTemplate[] => {
  return ALL_TEMPLATES.filter(template => template.category === category);
};

export const getTemplatesByDifficulty = (difficulty: GoalTemplate['difficulty']): GoalTemplate[] => {
  return ALL_TEMPLATES.filter(template => template.difficulty === difficulty);
};

export const getPopularTemplates = (): GoalTemplate[] => {
  // Return most popular templates based on common goals
  return [
    ALL_TEMPLATES.find(t => t.id === 'distance-1000km-annual')!,
    ALL_TEMPLATES.find(t => t.id === 'pace-5k-30min')!,
    ALL_TEMPLATES.find(t => t.id === 'time-100-hours-annual')!,
    ALL_TEMPLATES.find(t => t.id === 'distance-2500km-annual')!,
    ALL_TEMPLATES.find(t => t.id === 'frequency-12-races')!,
    ALL_TEMPLATES.find(t => t.id === 'pace-10k-60min')!
  ].filter(Boolean); // Remove any undefined templates
};

export const templateToGoalRequest = (template: GoalTemplate, targetDate: string): CreateGoalRequest => {
  const baseRequest: CreateGoalRequest = {
    type: template.category as CreateGoalRequest['type'],
    title: template.title,
    description: template.description,
    targetValue: template.targetValue,
    unit: template.unit,
    targetDate,
    priority: template.priority,
    category: template.timeframe === 'annual' ? 'annual' : 
              template.timeframe === 'monthly' ? 'monthly' : 'race_specific'
  };

  // Add additional details based on goal type
  if (template.category === 'pace' && template.raceDistance) {
    baseRequest.additionalDetails = {
      raceDistance: template.raceDistance,
      raceType: `${template.raceDistance}m`
    };
  } else if (template.category === 'frequency' && template.raceType) {
    baseRequest.additionalDetails = {
      raceType: template.raceType
    };
  } else if (template.category === 'consistency' && template.runsPerWeek) {
    baseRequest.additionalDetails = {
      runsPerWeek: template.runsPerWeek
    };
  }

  return baseRequest;
};