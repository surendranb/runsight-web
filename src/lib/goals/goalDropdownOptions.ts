// Dropdown Configuration for Smart Goal Creation
// Based on user feedback: Distance goals allow custom input, Pace goals use dropdowns for common times

export interface DropdownOption {
  value: number;
  label: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description?: string;
}

export interface TimeframeOption {
  value: 'monthly' | 'yearly' | 'custom';
  label: string;
  description: string;
}

// Distance Goal Configuration
// Users can enter custom distances, but we provide suggestions
export const DISTANCE_SUGGESTIONS = {
  yearly: [
    { value: 500, label: '500km', difficulty: 'beginner' as const, description: 'Great starting goal' },
    { value: 1000, label: '1000km', difficulty: 'intermediate' as const, description: 'Classic annual goal' },
    { value: 1500, label: '1500km', difficulty: 'intermediate' as const, description: 'Solid commitment' },
    { value: 2000, label: '2000km', difficulty: 'advanced' as const, description: 'Serious runner goal' },
    { value: 2500, label: '2500km', difficulty: 'advanced' as const, description: 'Elite level volume' }
  ],
  monthly: [
    { value: 50, label: '50km', difficulty: 'beginner' as const, description: '~12km per week' },
    { value: 100, label: '100km', difficulty: 'intermediate' as const, description: '~25km per week' },
    { value: 150, label: '150km', difficulty: 'intermediate' as const, description: '~37km per week' },
    { value: 200, label: '200km', difficulty: 'advanced' as const, description: '~50km per week' }
  ]
};

// Pace Goal Configuration - Dropdown based with common race times
export const RACE_DISTANCES = [
  { value: 5000, label: '5K', description: '5 kilometers' },
  { value: 10000, label: '10K', description: '10 kilometers' },
  { value: 21097, label: 'Half Marathon', description: '21.1 kilometers' },
  { value: 42195, label: 'Marathon', description: '42.2 kilometers' }
];

export const PACE_TARGET_TIMES = {
  5000: [ // 5K times in seconds
    { value: 1200, label: '20:00', difficulty: 'advanced' as const, description: 'Elite level' },
    { value: 1320, label: '22:00', difficulty: 'advanced' as const, description: 'Very competitive' },
    { value: 1500, label: '25:00', difficulty: 'intermediate' as const, description: 'Solid runner' },
    { value: 1680, label: '28:00', difficulty: 'intermediate' as const, description: 'Good fitness' },
    { value: 1800, label: '30:00', difficulty: 'beginner' as const, description: 'Popular milestone' },
    { value: 2100, label: '35:00', difficulty: 'beginner' as const, description: 'Great starting goal' }
  ],
  10000: [ // 10K times in seconds
    { value: 2400, label: '40:00', difficulty: 'advanced' as const, description: 'Elite level' },
    { value: 2700, label: '45:00', difficulty: 'advanced' as const, description: 'Very competitive' },
    { value: 3000, label: '50:00', difficulty: 'intermediate' as const, description: 'Solid runner' },
    { value: 3300, label: '55:00', difficulty: 'intermediate' as const, description: 'Good fitness' },
    { value: 3600, label: '60:00', difficulty: 'beginner' as const, description: 'Popular milestone' },
    { value: 4200, label: '70:00', difficulty: 'beginner' as const, description: 'Great starting goal' }
  ],
  21097: [ // Half Marathon times in seconds
    { value: 5400, label: '1:30:00', difficulty: 'advanced' as const, description: 'Elite level' },
    { value: 6300, label: '1:45:00', difficulty: 'advanced' as const, description: 'Very competitive' },
    { value: 7200, label: '2:00:00', difficulty: 'intermediate' as const, description: 'Popular milestone' },
    { value: 8100, label: '2:15:00', difficulty: 'intermediate' as const, description: 'Solid runner' },
    { value: 9000, label: '2:30:00', difficulty: 'beginner' as const, description: 'Good fitness' },
    { value: 10800, label: '3:00:00', difficulty: 'beginner' as const, description: 'Great starting goal' }
  ],
  42195: [ // Marathon times in seconds
    { value: 10800, label: '3:00:00', difficulty: 'advanced' as const, description: 'Elite level' },
    { value: 12600, label: '3:30:00', difficulty: 'advanced' as const, description: 'Very competitive' },
    { value: 14400, label: '4:00:00', difficulty: 'intermediate' as const, description: 'Popular milestone' },
    { value: 16200, label: '4:30:00', difficulty: 'intermediate' as const, description: 'Solid runner' },
    { value: 18000, label: '5:00:00', difficulty: 'beginner' as const, description: 'Good fitness' },
    { value: 21600, label: '6:00:00', difficulty: 'beginner' as const, description: 'Great starting goal' }
  ]
};

// Runs Goal Configuration
// Users can enter custom run counts, but we provide suggestions
export const RUNS_SUGGESTIONS = {
  yearly: [
    { value: 50, label: '50 runs', difficulty: 'beginner' as const, description: '~1 run per week' },
    { value: 100, label: '100 runs', difficulty: 'intermediate' as const, description: '~2 runs per week' },
    { value: 150, label: '150 runs', difficulty: 'intermediate' as const, description: '~3 runs per week' },
    { value: 200, label: '200 runs', difficulty: 'advanced' as const, description: '~4 runs per week' },
    { value: 250, label: '250 runs', difficulty: 'advanced' as const, description: '~5 runs per week' }
  ],
  monthly: [
    { value: 8, label: '8 runs', difficulty: 'beginner' as const, description: '2 runs per week' },
    { value: 12, label: '12 runs', difficulty: 'intermediate' as const, description: '3 runs per week' },
    { value: 16, label: '16 runs', difficulty: 'intermediate' as const, description: '4 runs per week' },
    { value: 20, label: '20 runs', difficulty: 'advanced' as const, description: '5 runs per week' },
    { value: 24, label: '24 runs', difficulty: 'advanced' as const, description: '6 runs per week' }
  ]
};

// Timeframe Options
export const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  { value: 'yearly', label: 'This Year (2025)', description: 'Goal for the entire year' },
  { value: 'monthly', label: 'This Month', description: 'Goal for the current month' },
  { value: 'custom', label: 'Custom Date Range', description: 'Set your own target date' }
];

// Priority Options
export const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High Priority', description: 'Your main focus goal' },
  { value: 'medium', label: 'Medium Priority', description: 'Important but flexible' },
  { value: 'low', label: 'Low Priority', description: 'Nice to have goal' }
];

// Helper functions for goal creation
export const formatTimeFromSeconds = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
};

export const formatDistanceFromMeters = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  } else {
    return `${meters}m`;
  }
};

export const generateGoalTitle = (
  type: 'distance' | 'pace' | 'runs',
  targetValue: number,
  timeframe: string,
  raceDistance?: number
): string => {
  switch (type) {
    case 'distance':
      const distanceKm = targetValue / 1000;
      return `Run ${distanceKm}km ${timeframe === 'yearly' ? 'this year' : timeframe === 'monthly' ? 'this month' : 'by target date'}`;
    
    case 'pace':
      const raceLabel = raceDistance === 5000 ? '5K' :
                       raceDistance === 10000 ? '10K' :
                       raceDistance === 21097 ? 'Half Marathon' :
                       raceDistance === 42195 ? 'Marathon' : 'Race';
      const timeLabel = formatTimeFromSeconds(targetValue);
      return `${raceLabel} under ${timeLabel}`;
    
    case 'runs':
      return `${targetValue} runs ${timeframe === 'yearly' ? 'this year' : timeframe === 'monthly' ? 'this month' : 'by target date'}`;
    
    default:
      return 'Running Goal';
  }
};

export const generateGoalDescription = (
  type: 'distance' | 'pace' | 'runs',
  targetValue: number,
  timeframe: string,
  difficulty: string,
  raceDistance?: number
): string => {
  const difficultyText = difficulty === 'beginner' ? 'A great starting goal' :
                        difficulty === 'intermediate' ? 'A solid challenge' :
                        'An ambitious target';
  
  switch (type) {
    case 'distance':
      const distanceKm = targetValue / 1000;
      return `${difficultyText} - run ${distanceKm}km total ${timeframe === 'yearly' ? 'throughout the year' : timeframe === 'monthly' ? 'in one month' : 'by your target date'}.`;
    
    case 'pace':
      const raceLabel = raceDistance === 5000 ? '5K' :
                       raceDistance === 10000 ? '10K' :
                       raceDistance === 21097 ? 'half marathon' :
                       raceDistance === 42195 ? 'marathon' : 'race';
      const timeLabel = formatTimeFromSeconds(targetValue);
      return `${difficultyText} - achieve a ${raceLabel} time under ${timeLabel}.`;
    
    case 'runs':
      const frequency = timeframe === 'yearly' ? `${Math.round(targetValue / 52)} runs per week on average` :
                       timeframe === 'monthly' ? `${Math.round(targetValue / 4)} runs per week` :
                       `${targetValue} total runs`;
      return `${difficultyText} - complete ${targetValue} runs (${frequency}).`;
    
    default:
      return 'A personalized running goal to help you stay motivated and track progress.';
  }
};