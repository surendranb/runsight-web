# Goals Page Integration Fix - Design Document

## Overview

This design addresses the Goals page routing issue where users see "Coming Soon!" instead of the actual Goals page, and enhances the Goals system with diverse goal types and AI-powered progress tracking with course correction recommendations.

## Architecture

### Component Structure
```
SecureApp.tsx (Main Router)
├── NavigationBar.tsx (Navigation)
├── GoalsPage.tsx (Main Goals Interface)
│   ├── GoalCreationModal.tsx (Goal Creation)
│   ├── GoalCard.tsx (Individual Goal Display)
│   ├── GoalTemplates.tsx (Pre-defined Goal Templates)
│   └── AIInsights.tsx (AI Coach Integration)
└── AICoachSetup.tsx (API Key Configuration)
```

### Data Flow
```
User Action → GoalsPage → Goal State Management → AI Coach Analysis → Progress Updates
```

## Components and Interfaces

### 1. Routing Fix (SecureApp.tsx)
**Issue**: Goals page shows "Coming Soon!" instead of GoalsPage component
**Solution**: Ensure proper routing logic and component rendering

```typescript
// Current problematic code pattern:
{(currentView === 'goals' || currentView === 'settings') && (
  <ComingSoonPlaceholder />
)}

// Fixed code pattern:
{currentView === 'goals' && (
  <GoalsPage user={user} runs={runs} isLoading={dataLoading} error={dataError} />
)}
{currentView === 'settings' && (
  <ComingSoonPlaceholder />
)}
```

### 2. Enhanced Goal Types System

#### Goal Type Definitions
```typescript
type GoalType = 'distance' | 'pace' | 'frequency' | 'consistency' | 'race';

interface Goal {
  id: string;
  userId: string;
  type: GoalType;
  title: string;
  description?: string;
  targetValue: number;
  targetDate: string;
  priority: 'high' | 'medium' | 'low';
  category: 'annual' | 'monthly' | 'race' | 'training';
  
  // Type-specific fields
  raceDistance?: number; // For pace goals (5K, 10K, half marathon, etc.)
  raceType?: string; // For frequency goals (half marathon, marathon, etc.)
  unit: string; // meters, seconds, count, runs/week
  
  // Progress tracking
  currentValue: number;
  status: 'active' | 'completed' | 'paused' | 'failed';
  createdAt: string;
  updatedAt: string;
}
```

#### Goal Templates
```typescript
const GOAL_TEMPLATES = {
  distance: [
    { title: "1000km in 2025", target: 1000000, unit: "meters", timeframe: "annual" },
    { title: "2500km in 2025", target: 2500000, unit: "meters", timeframe: "annual" },
    { title: "100km this month", target: 100000, unit: "meters", timeframe: "monthly" }
  ],
  pace: [
    { title: "5K under 30 minutes", target: 1800, unit: "seconds", distance: 5000 },
    { title: "10K under 60 minutes", target: 3600, unit: "seconds", distance: 10000 },
    { title: "Half Marathon under 2 hours", target: 7200, unit: "seconds", distance: 21097 }
  ],
  frequency: [
    { title: "20 half marathons this year", target: 20, unit: "races", raceType: "half_marathon" },
    { title: "12 races this year", target: 12, unit: "races", raceType: "any" },
    { title: "4 marathons this year", target: 4, unit: "races", raceType: "marathon" }
  ]
};
```

### 3. AI Coach Progress Tracking

#### Progress Analysis Engine
```typescript
interface ProgressAnalysis {
  status: 'on_track' | 'behind' | 'ahead';
  progressPercentage: number;
  projectedCompletion: number; // percentage
  daysRemaining: number;
  courseCorrectionNeeded: boolean;
  recommendations: string[];
  insights: string[];
}

interface CourseCorrection {
  severity: 'minor' | 'moderate' | 'major';
  adjustmentType: 'increase_frequency' | 'increase_distance' | 'improve_pace' | 'adjust_timeline';
  specificActions: string[];
  timelineAdjustment?: number; // days to extend/reduce
  trainingAdjustment?: {
    weeklyDistance?: number;
    weeklyFrequency?: number;
    targetPace?: number;
  };
}
```

#### AI Coach Integration Points
1. **Goal Creation**: Feasibility analysis when creating goals
2. **Progress Monitoring**: Weekly progress assessments
3. **Course Correction**: Recommendations when falling behind
4. **Achievement Prediction**: Success probability updates

### 4. Enhanced GoalsPage Component

#### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Goals & Progress Header                                 │
│ [New Goal Button]                                       │
├─────────────────────────────────────────────────────────┤
│ Goals Overview Stats (4-column grid)                   │
│ [Total] [On Track] [Completed] [Avg Progress]          │
├─────────────────────────────────────────────────────────┤
│ Goals List                                              │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Goal Card 1                                         │ │
│ │ [Progress Bar] [Status] [Actions]                   │ │
│ │ [AI Insights] [Course Corrections]                  │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ AI Coach Section (Tabbed Interface)                    │
│ [Training Insights] [Goal Analysis] [Progress Check]   │
└─────────────────────────────────────────────────────────┘
```

## Data Models

### Goal Progress Calculation
```typescript
function calculateGoalProgress(goal: Goal, runs: Run[]): ProgressAnalysis {
  const relevantRuns = filterRunsForGoal(goal, runs);
  
  switch (goal.type) {
    case 'distance':
      return calculateDistanceProgress(goal, relevantRuns);
    case 'pace':
      return calculatePaceProgress(goal, relevantRuns);
    case 'frequency':
      return calculateFrequencyProgress(goal, relevantRuns);
    case 'consistency':
      return calculateConsistencyProgress(goal, relevantRuns);
  }
}
```

### AI Coach Analysis Pipeline
```typescript
async function analyzeGoalProgress(goal: Goal, runs: Run[]): Promise<CourseCorrection[]> {
  const progress = calculateGoalProgress(goal, runs);
  const historicalTrends = analyzePerformanceTrends(runs);
  const seasonalFactors = analyzeSeasonalPatterns(runs);
  
  return await aiCoachClient.generateCourseCorrections({
    goal,
    progress,
    historicalTrends,
    seasonalFactors,
    timeRemaining: calculateTimeRemaining(goal.targetDate)
  });
}
```

## Error Handling

### Routing Error Recovery
1. **Component Not Found**: Fallback to dashboard with error message
2. **Data Loading Errors**: Show error state with retry option
3. **AI Coach Errors**: Graceful degradation to manual progress tracking

### Goal Creation Validation
1. **Date Validation**: Ensure target date is in the future
2. **Value Validation**: Ensure target values are realistic
3. **Conflict Detection**: Warn about conflicting goals

## Testing Strategy

### Unit Tests
- Goal progress calculation functions
- AI coach integration methods
- Goal creation and validation logic

### Integration Tests
- Navigation between sections
- Goal CRUD operations
- AI coach API integration

### User Acceptance Tests
- Goal creation workflow
- Progress tracking accuracy
- AI recommendations relevance

## Implementation Priority

### Phase 1: Fix Routing Issue
1. Fix SecureApp.tsx routing logic
2. Ensure GoalsPage component renders correctly
3. Test navigation between sections

### Phase 2: Enhanced Goal Types
1. Implement goal templates
2. Add diverse goal type support
3. Update goal creation modal

### Phase 3: AI Coach Integration
1. Implement progress analysis
2. Add course correction recommendations
3. Integrate AI insights into goal cards

### Phase 4: Polish and Optimization
1. Add animations and transitions
2. Optimize performance
3. Add advanced features (goal sharing, etc.)