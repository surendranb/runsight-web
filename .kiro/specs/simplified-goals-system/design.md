# Simplified Goals System - Design Document

## Overview

This design document outlines a complete rebuild of the goals system with a focus on simplicity, usability, and robust data handling. The system will support exactly 3 goal types with dropdown-based creation and accurate progress tracking.

## Architecture

### System Components
```
┌─────────────────────────────────────────────────────────┐
│                   Frontend Layer                        │
├─────────────────────────────────────────────────────────┤
│ ModernDashboard.tsx (Dynamic Goal Display)             │
│ GoalsPage.tsx (Goal Management)                         │
│ CreateGoalModal.tsx (Dropdown-based Creation)          │
│ GoalCard.tsx (Individual Goal Display)                 │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                   Business Logic                        │
├─────────────────────────────────────────────────────────┤
│ goalCalculator.ts (Progress Calculation)               │
│ goalValidator.ts (Input Validation)                     │
│ goalTemplates.ts (Dropdown Options)                    │
│ aiCoachGoals.ts (AI Insights)                          │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                   Data Layer                            │
├─────────────────────────────────────────────────────────┤
│ Supabase MCP Integration                                │
│ goals table (existing schema)                          │
│ runs table (for progress calculation)                   │
└─────────────────────────────────────────────────────────┘
```

## Data Models

### Simplified Goal Types

```typescript
// Only 3 goal types
type GoalType = 'distance' | 'pace' | 'runs';

interface BaseGoal {
  id: string;
  userId: string;
  type: GoalType;
  title: string; // Auto-generated from selections
  description: string; // Auto-generated
  targetValue: number;
  unit: string;
  targetDate: string;
  status: 'active' | 'completed' | 'paused';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  updatedAt: string;
}

// Distance Goal: "Run 1000km this year"
interface DistanceGoal extends BaseGoal {
  type: 'distance';
  unit: 'meters';
  targetValue: number; // e.g., 1000000 (1000km in meters)
  timeframe: 'monthly' | 'yearly' | 'custom';
}

// Pace Goal: "Run 5K under 25 minutes"
interface PaceGoal extends BaseGoal {
  type: 'pace';
  unit: 'seconds';
  targetValue: number; // e.g., 1500 (25 minutes in seconds)
  raceDistance: 5000 | 10000 | 21097 | 42195; // meters
}

// Runs Goal: "Run 100 times this year"
interface RunsGoal extends BaseGoal {
  type: 'runs';
  unit: 'runs';
  targetValue: number; // e.g., 100
  timeframe: 'monthly' | 'yearly' | 'custom';
}
```

### Dropdown Configuration

```typescript
// Distance Goal Options
const DISTANCE_OPTIONS = {
  yearly: [
    { value: 500000, label: '500km this year', difficulty: 'beginner' },
    { value: 1000000, label: '1000km this year', difficulty: 'intermediate' },
    { value: 1500000, label: '1500km this year', difficulty: 'intermediate' },
    { value: 2000000, label: '2000km this year', difficulty: 'advanced' },
    { value: 2500000, label: '2500km this year', difficulty: 'advanced' }
  ],
  monthly: [
    { value: 50000, label: '50km this month', difficulty: 'beginner' },
    { value: 100000, label: '100km this month', difficulty: 'intermediate' },
    { value: 150000, label: '150km this month', difficulty: 'intermediate' },
    { value: 200000, label: '200km this month', difficulty: 'advanced' }
  ]
};

// Pace Goal Options
const PACE_OPTIONS = {
  5000: [ // 5K
    { value: 1200, label: 'under 20 minutes', difficulty: 'advanced' },
    { value: 1320, label: 'under 22 minutes', difficulty: 'advanced' },
    { value: 1500, label: 'under 25 minutes', difficulty: 'intermediate' },
    { value: 1800, label: 'under 30 minutes', difficulty: 'beginner' },
    { value: 2100, label: 'under 35 minutes', difficulty: 'beginner' }
  ],
  10000: [ // 10K
    { value: 2400, label: 'under 40 minutes', difficulty: 'advanced' },
    { value: 2700, label: 'under 45 minutes', difficulty: 'advanced' },
    { value: 3000, label: 'under 50 minutes', difficulty: 'intermediate' },
    { value: 3600, label: 'under 60 minutes', difficulty: 'beginner' }
  ],
  21097: [ // Half Marathon
    { value: 5400, label: 'under 1:30', difficulty: 'advanced' },
    { value: 6300, label: 'under 1:45', difficulty: 'advanced' },
    { value: 7200, label: 'under 2:00', difficulty: 'intermediate' },
    { value: 8100, label: 'under 2:15', difficulty: 'intermediate' },
    { value: 9000, label: 'under 2:30', difficulty: 'beginner' }
  ],
  42195: [ // Marathon
    { value: 10800, label: 'under 3:00', difficulty: 'advanced' },
    { value: 12600, label: 'under 3:30', difficulty: 'advanced' },
    { value: 14400, label: 'under 4:00', difficulty: 'intermediate' },
    { value: 16200, label: 'under 4:30', difficulty: 'intermediate' },
    { value: 18000, label: 'under 5:00', difficulty: 'beginner' }
  ]
};

// Runs Goal Options
const RUNS_OPTIONS = {
  yearly: [
    { value: 50, label: '50 runs this year', difficulty: 'beginner' },
    { value: 100, label: '100 runs this year', difficulty: 'intermediate' },
    { value: 150, label: '150 runs this year', difficulty: 'intermediate' },
    { value: 200, label: '200 runs this year', difficulty: 'advanced' }
  ],
  monthly: [
    { value: 8, label: '8 runs this month', difficulty: 'beginner' },
    { value: 12, label: '12 runs this month', difficulty: 'intermediate' },
    { value: 16, label: '16 runs this month', difficulty: 'intermediate' },
    { value: 20, label: '20 runs this month', difficulty: 'advanced' }
  ]
};
```

## Component Design

### 1. CreateGoalModal Component

```typescript
interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: CreateGoalRequest) => Promise<void>;
}

// Step-by-step flow:
// Step 1: Select Goal Type (distance/pace/runs)
// Step 2: Select Specific Options (based on type)
// Step 3: Select Timeframe/Priority
// Step 4: Review and Submit
```

### 2. Data Quality Filter

```typescript
class DataQualityFilter {
  // Filter out GPS errors and data anomalies
  filterValidRuns(runs: Run[]): Run[] {
    return runs.filter(run => this.isValidRun(run));
  }

  private isValidRun(run: Run): boolean {
    // Filter out GPS errors - distance outliers
    if (run.distance < 500 || run.distance > 200000) { // 0.5km to 200km
      return false;
    }

    // Filter out pace outliers
    const pacePerKm = run.moving_time / (run.distance / 1000);
    if (pacePerKm < 150 || pacePerKm > 720) { // 2:30/km to 12:00/km
      return false;
    }

    // Filter out runs with zero or negative time
    if (run.moving_time <= 0) {
      return false;
    }

    // Filter out runs with unrealistic speed (faster than world record pace)
    const speedKmh = (run.distance / 1000) / (run.moving_time / 3600);
    if (speedKmh > 25) { // Faster than ~2:24/km (world record territory)
      return false;
    }

    return true;
  }

  // For pace goals, filter runs within distance tolerance
  filterRunsForPaceGoal(runs: Run[], targetDistance: number, tolerance = 0.1): Run[] {
    const validRuns = this.filterValidRuns(runs);
    const minDistance = targetDistance * (1 - tolerance);
    const maxDistance = targetDistance * (1 + tolerance);
    
    return validRuns.filter(run => 
      run.distance >= minDistance && run.distance <= maxDistance
    );
  }
}
```

### 3. Goal Progress Calculation

```typescript
class GoalCalculator {
  // Distance Goal: Sum all run distances in timeframe
  calculateDistanceProgress(goal: DistanceGoal, runs: Run[]): GoalProgress {
    const relevantRuns = this.filterRunsByTimeframe(runs, goal);
    const totalDistance = relevantRuns.reduce((sum, run) => sum + run.distance, 0);
    const progressPercentage = (totalDistance / goal.targetValue) * 100;
    
    return {
      currentValue: totalDistance,
      progressPercentage: Math.min(100, progressPercentage),
      isOnTrack: this.calculateOnTrackStatus(goal, progressPercentage),
      projectedCompletion: this.calculateProjectedCompletion(goal, progressPercentage),
      recommendations: this.generateDistanceRecommendations(goal, progressPercentage)
    };
  }

  // Pace Goal: Find best time for target distance (±10% tolerance)
  calculatePaceProgress(goal: PaceGoal, runs: Run[]): GoalProgress {
    const targetDistance = goal.raceDistance;
    const tolerance = targetDistance * 0.1; // ±10%
    
    const relevantRuns = runs.filter(run => 
      Math.abs(run.distance - targetDistance) <= tolerance
    );
    
    if (relevantRuns.length === 0) {
      return { currentValue: 0, progressPercentage: 0, /* ... */ };
    }
    
    const bestTime = Math.min(...relevantRuns.map(run => run.moving_time));
    const isAchieved = bestTime <= goal.targetValue;
    
    return {
      currentValue: bestTime,
      progressPercentage: isAchieved ? 100 : (goal.targetValue / bestTime) * 100,
      isOnTrack: isAchieved,
      recommendations: this.generatePaceRecommendations(goal, bestTime)
    };
  }

  // Runs Goal: Count runs in timeframe
  calculateRunsProgress(goal: RunsGoal, runs: Run[]): GoalProgress {
    const relevantRuns = this.filterRunsByTimeframe(runs, goal);
    const currentCount = relevantRuns.length;
    const progressPercentage = (currentCount / goal.targetValue) * 100;
    
    return {
      currentValue: currentCount,
      progressPercentage: Math.min(100, progressPercentage),
      isOnTrack: this.calculateOnTrackStatus(goal, progressPercentage),
      recommendations: this.generateRunsRecommendations(goal, currentCount)
    };
  }
}
```

### 3. AI Coach Integration

```typescript
class AICoachGoals {
  generateDistanceAdvice(goal: DistanceGoal, progress: GoalProgress): string[] {
    const advice = [];
    
    if (!progress.isOnTrack) {
      const remaining = goal.targetValue - progress.currentValue;
      const daysLeft = this.calculateDaysRemaining(goal.targetDate);
      const dailyTarget = (remaining / 1000) / daysLeft; // km per day
      
      advice.push(`To get back on track, aim for ${dailyTarget.toFixed(1)}km per day`);
      advice.push(`Consider adding one extra run per week to catch up`);
    } else {
      advice.push(`Great progress! You're on track to achieve your ${goal.targetValue/1000}km goal`);
    }
    
    return advice;
  }

  generatePaceAdvice(goal: PaceGoal, progress: GoalProgress): string[] {
    const advice = [];
    const targetPacePerKm = goal.targetValue / (goal.raceDistance / 1000);
    
    if (progress.progressPercentage < 100) {
      advice.push(`Target pace: ${this.formatPace(targetPacePerKm)} per km`);
      advice.push(`Try interval training: 4x800m at target pace with 2min rest`);
      advice.push(`Include tempo runs at slightly slower than target pace`);
    } else {
      advice.push(`Congratulations! You've achieved your ${this.formatDistance(goal.raceDistance)} goal!`);
      advice.push(`Consider setting a more ambitious pace goal`);
    }
    
    return advice;
  }

  generateRunsAdvice(goal: RunsGoal, progress: GoalProgress): string[] {
    const advice = [];
    
    if (!progress.isOnTrack) {
      const remaining = goal.targetValue - progress.currentValue;
      const daysLeft = this.calculateDaysRemaining(goal.targetDate);
      const runsPerWeek = (remaining / daysLeft) * 7;
      
      advice.push(`Aim for ${Math.ceil(runsPerWeek)} runs per week to stay on track`);
      advice.push(`Consider shorter, easier runs to maintain consistency`);
    } else {
      advice.push(`Excellent consistency! You're building a strong running habit`);
    }
    
    return advice;
  }
}
```

## Database Integration

### Supabase MCP Usage

```typescript
// Use Supabase MCP for all database operations
class GoalService {
  async createGoal(userId: string, goalData: CreateGoalRequest): Promise<Goal> {
    // Use mcp_supabase_execute_sql to insert goal
    const query = `
      INSERT INTO goals (user_id, type, title, description, target_value, unit, target_date, additional_details)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await this.supabaseMCP.executeSql(query, [
      userId,
      goalData.type,
      goalData.title,
      goalData.description,
      goalData.targetValue,
      goalData.unit,
      goalData.targetDate,
      JSON.stringify(goalData.additionalDetails || {})
    ]);
    
    return result.data[0];
  }

  async getUserGoals(userId: string): Promise<Goal[]> {
    const query = `
      SELECT * FROM goals 
      WHERE user_id = $1 AND status = 'active'
      ORDER BY priority DESC, created_at DESC
    `;
    
    const result = await this.supabaseMCP.executeSql(query, [userId]);
    return result.data;
  }

  async updateGoalProgress(goalId: string, currentValue: number): Promise<void> {
    const query = `
      UPDATE goals 
      SET current_value = $1, updated_at = NOW()
      WHERE id = $2
    `;
    
    await this.supabaseMCP.executeSql(query, [currentValue, goalId]);
  }
}
```

## Error Handling & Validation

### Input Validation
- All dropdown selections validated against predefined options
- Date validation ensures target dates are in the future
- Numeric validation for custom values
- Duplicate goal prevention (same type + similar target)

### Progress Calculation Robustness
- Handle timezone differences in date calculations
- Account for leap years in yearly goals
- Handle month boundary edge cases
- Graceful handling of missing or invalid run data

## Testing Strategy

### Unit Tests
- Goal progress calculation accuracy
- Dropdown option validation
- Date/time handling edge cases
- AI coach recommendation logic

### Integration Tests
- Supabase MCP database operations
- Goal creation and retrieval flow
- Progress updates from run sync
- Dashboard goal display updates

### User Acceptance Tests
- Complete goal creation workflow
- Progress tracking accuracy
- AI coach advice relevance
- Dashboard integration functionality