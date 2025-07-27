# Insights System Architecture

## Overview
The insights system provides advanced analytics for running data through modular, reusable components and utilities.

## Insight Categories

### Performance Analytics
- **Consistency Insight**: Tracks running consistency over time with streak analysis
- **Personal Records**: Identifies and tracks personal bests across different metrics
- **Advanced Performance**: Complex performance metrics and correlations

### Environmental Analytics
- **Weather Performance**: Correlates performance with weather conditions (temperature, humidity)
- **Wind Performance**: Analyzes impact of wind conditions on running performance
- **Time of Day**: Identifies performance patterns based on workout timing

### Effort and Terrain Analytics
- **Elevation Effort**: Analyzes relationship between elevation gain and effort/pace
- **Workout Type Performance**: Compares performance across different workout types
- **Location Intelligence**: Route analysis and location-based insights

### Summary Analytics
- **Monthly Summary**: Comprehensive monthly statistics and trends

## Technical Implementation

### Component Structure
Each insight follows a consistent pattern:
```typescript
interface InsightProps {
  user: User;
  runs: EnrichedRun[];
  isLoading?: boolean;
  error?: string | null;
}
```

### Utility Functions
Each insight has corresponding utility functions in `src/lib/insights/`:
- Data processing and calculation logic
- Statistical analysis functions
- Chart data preparation
- Filtering and aggregation helpers

### Data Requirements
- **EnrichedRun**: Core run data with weather enrichment
- **Weather Data**: Temperature, humidity, wind speed/direction
- **Location Data**: Start/end coordinates, elevation data
- **Performance Metrics**: Pace, heart rate, distance, time

### Visualization Standards
- **Recharts**: Primary charting library for consistency
- **Responsive Design**: All charts adapt to container size
- **Color Scheme**: Consistent color palette across insights
- **Accessibility**: Proper labels and alt text for screen readers

## Adding New Insights

### 1. Create Utility Functions
```typescript
// src/lib/insights/newInsightUtils.ts
export const calculateNewMetric = (runs: EnrichedRun[]) => {
  // Implementation
};
```

### 2. Create Component
```typescript
// src/components/insights/NewInsight.tsx
export const NewInsight: React.FC<InsightProps> = ({ user, runs }) => {
  // Implementation using utility functions
};
```

### 3. Add to Insights Page
```typescript
// src/components/InsightsPage.tsx
import { NewInsight } from './insights/NewInsight';
// Add to component list
```

## Data Processing Pipeline
1. **Raw Strava Data**: Activity data from Strava API
2. **Weather Enrichment**: Historical weather data added
3. **Outlier Detection**: Statistical outliers filtered out
4. **Insight Calculation**: Metrics calculated using utility functions
5. **Visualization**: Data formatted for charts and displays

## Performance Considerations
- **Memoization**: Use useMemo for expensive calculations
- **Data Filtering**: Filter data before processing when possible
- **Lazy Loading**: Consider lazy loading for complex insights
- **Caching**: Cache calculated results when appropriate