# RunSight Design Document

## Overview

RunSight transforms from a basic activity viewer into a comprehensive running analytics platform with AI-powered coaching. The design focuses on three core pillars: **Clean User Experience**, **Intelligent Analytics**, and **Personalized Coaching**.

## Architecture

### High-Level System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend APIs   │    │   Data Layer    │
│                 │    │                  │    │                 │
│ • Dashboard     │◄──►│ • Sync Engine    │◄──►│ • Supabase DB   │
│ • Analytics     │    │ • Weather API    │    │ • Weather Cache │
│ • AI Coach      │    │ • AI Engine      │    │ • User Goals    │
│ • Goal Tracker  │    │ • Insights Gen   │    │ • Insights      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Data Flow Architecture

```
Strava API → Sync Engine → Weather Enrichment → Location Geocoding → Database
                                    ↓
AI Engine ← Analytics Engine ← Insights Generator ← Enhanced Data
    ↓
Dashboard ← Coaching Recommendations ← Goal Tracker ← User Interface
```

## Components and Interfaces

### 1. Modern Dashboard Redesign

**Current Problem**: Cluttered interface with too many boxes and options
**Solution**: Clean, story-driven dashboard with clear visual hierarchy

#### Dashboard Layout Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Navigation Bar                           │
├─────────────────────────────────────────────────────────────┤
│  🎯 Goal Progress Bar: "67% to your 2025 goal of 1000 miles" │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   This Month    │  │   Recent PR     │  │ Weather Rec  │ │
│  │   127 miles     │  │   5K: 22:15     │  │ Perfect for  │ │
│  │   ↗️ +12% vs last │  │   🏆 New!       │  │ a long run!  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Performance Trend Chart                    │ │
│  │  [Beautiful line chart showing pace improvement]       │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                Recent Activities                        │ │
│  │  🏃‍♂️ Morning Run  • 5.2mi • 7:45/mi • ☀️ 72°F • 💚      │ │
│  │  🏃‍♂️ Track Workout • 3.1mi • 7:12/mi • ⛅ 68°F • 💛      │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Key Design Principles

1. **Visual Hierarchy**: Most important info (goal progress) at top
2. **Glanceable Metrics**: Key stats in prominent cards
3. **Story-Driven**: Charts that show progress and trends
4. **Contextual**: Weather and performance correlations visible
5. **Actionable**: Clear next steps and recommendations

### 2. Weather Analytics Engine

#### Weather Data Integration

```javascript
// Enhanced sync process with weather enrichment
const enrichedRun = {
  // Existing run data
  ...runData,
  
  // Weather enrichment
  weather: {
    temperature_celsius: 22,
    feels_like_celsius: 24,
    humidity_percent: 65,
    wind_speed_ms: 3.2,
    wind_direction_degrees: 180,
    weather_condition: 'partly_cloudy',
    pressure_hpa: 1013,
    visibility_meters: 10000,
    uv_index: 6
  },
  
  // Location enrichment
  location: {
    city: 'San Francisco',
    state: 'California',
    country: 'United States',
    elevation_meters: 50
  }
}
```

#### Weather Performance Analytics

**Weather Correlation Analysis**:
- Temperature vs Pace correlation
- Humidity impact on performance
- Wind speed effect on effort
- Optimal weather condition identification

**Weather Recommendations**:
- "Today's conditions (72°F, low humidity) are optimal for a tempo run"
- "You typically run 8% faster in these conditions"
- "Consider a recovery run - high humidity may impact performance"

### 3. AI-Powered Coaching System

#### Goal Setting & Tracking

```javascript
// Goal data structure
const userGoals = {
  annual: {
    distance_miles: 1000,
    races: [
      { name: "Marathon", date: "2025-10-15", target_time: "3:30:00" },
      { name: "Half Marathon", date: "2025-06-01", target_time: "1:35:00" }
    ],
    consistency: { runs_per_week: 4 }
  },
  
  progress: {
    current_distance: 670,
    percentage_complete: 67,
    on_track: true,
    projected_finish: 995,
    adjustment_needed: false
  }
}
```

#### AI Insights Engine

**Pattern Detection**:
- Consistency analysis: "You've run 4+ times per week for 8 consecutive weeks"
- Performance trends: "Your average pace has improved 15 seconds over 3 months"
- Weather preferences: "You perform best in 60-70°F with low humidity"
- Location insights: "Your fastest runs happen in Golden Gate Park"

**Coaching Recommendations**:
- Training adjustments: "Increase weekly mileage by 10% to stay on track"
- Recovery suggestions: "Consider a rest day - you've run 6 consecutive days"
- Race strategy: "Based on your training, target 7:30/mile for your marathon"

### 4. Enhanced Analytics Components

#### Performance Trend Analysis

```javascript
// Trend calculation engine
const performanceAnalytics = {
  pace_trend: {
    current_average: "7:45/mile",
    three_month_change: "-0:15/mile", // 15 seconds faster
    trend_direction: "improving",
    confidence: 0.85
  },
  
  consistency_score: {
    current: 0.78, // 78% consistency
    target: 0.80,
    trend: "stable"
  },
  
  personal_records: [
    { distance: "5K", time: "22:15", date: "2025-07-10", conditions: "ideal" },
    { distance: "10K", time: "46:30", date: "2025-06-15", conditions: "hot" }
  ]
}
```

#### Location Intelligence

**Geographic Performance Analysis**:
- Performance by city/state/elevation
- Route optimization suggestions
- Travel recommendations for optimal training
- Terrain impact analysis

### 5. Data Models

#### Enhanced Run Schema

```sql
-- Updated runs table with enrichment
ALTER TABLE runs ADD COLUMN IF NOT EXISTS
  -- Weather data
  temperature_celsius REAL,
  feels_like_celsius REAL,
  humidity_percent INTEGER,
  wind_speed_ms REAL,
  wind_direction_degrees INTEGER,
  weather_condition TEXT,
  pressure_hpa REAL,
  visibility_meters INTEGER,
  uv_index REAL,
  
  -- Location data
  city TEXT,
  state TEXT,
  country TEXT,
  elevation_meters REAL,
  
  -- Performance analysis
  effort_score REAL,
  weather_performance_index REAL,
  location_performance_index REAL;
```

#### New Tables for AI Features

```sql
-- User goals and targets
CREATE TABLE user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  goal_type TEXT NOT NULL, -- 'annual_distance', 'race', 'consistency'
  target_value JSONB NOT NULL,
  target_date DATE,
  current_progress REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-generated insights
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  insight_type TEXT NOT NULL, -- 'weather', 'performance', 'coaching'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  data JSONB,
  confidence_score REAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Performance analytics cache
CREATE TABLE performance_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- 'pace_trend', 'consistency', 'weather_correlation'
  time_period TEXT NOT NULL, -- '30d', '90d', '1y'
  calculated_value JSONB NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Error Handling

### Weather API Integration

**Rate Limiting**: OpenWeatherMap allows 1000 calls/day
- Batch weather requests for multiple runs
- Cache weather data to avoid duplicate API calls
- Graceful degradation when weather data unavailable

**Error Scenarios**:
- Weather API unavailable: Continue sync without weather data
- Invalid coordinates: Skip weather enrichment for that run
- Rate limit exceeded: Queue requests for later processing

### AI Insights Generation

**Data Quality Checks**:
- Minimum data requirements for meaningful insights
- Statistical significance validation
- Confidence scoring for recommendations

**Fallback Strategies**:
- Generic insights when personalized data insufficient
- Progressive enhancement as more data becomes available
- Clear communication of confidence levels to users

## Testing Strategy

### Unit Tests
- Weather enrichment functions
- Performance calculation algorithms
- Goal progress tracking logic
- AI insight generation

### Integration Tests
- Complete sync flow with weather enrichment
- Dashboard data loading and display
- Goal setting and progress updates
- Cross-component data consistency

### User Experience Tests
- Dashboard load performance with large datasets
- Mobile responsiveness across devices
- Accessibility compliance
- Visual regression testing for UI changes

## Performance Considerations

### Data Processing
- **Batch Processing**: Weather enrichment for multiple runs
- **Caching Strategy**: Cache calculated analytics to avoid recomputation
- **Lazy Loading**: Load dashboard components progressively
- **Database Optimization**: Proper indexing for analytics queries

### Frontend Performance
- **Code Splitting**: Load AI features only when needed
- **Image Optimization**: Weather icons and charts
- **State Management**: Efficient data flow for real-time updates
- **Progressive Enhancement**: Core features work without JavaScript

## Security Considerations

### API Key Management
- Weather API keys stored securely in environment variables
- Rate limiting to prevent API abuse
- Request validation and sanitization

### User Data Protection
- Goal data encrypted at rest
- Insights data retention policies
- User consent for AI analysis
- Data export and deletion capabilities

### AI Ethics
- Transparent algorithm explanations
- Bias detection in recommendations
- User control over AI features
- Clear data usage policies

## Deployment Strategy

### Phased Rollout

**Phase 0: UI Foundation (Week 1-2)**
- Dashboard redesign
- Visual hierarchy improvements
- Basic chart enhancements

**Phase 1: Weather Integration (Week 3-4)**
- Weather API integration
- Sync process enhancement
- Basic weather analytics

**Phase 2: Performance Analytics (Week 5-6)**
- Trend analysis implementation
- Personal records tracking
- Advanced metrics calculation

**Phase 3: AI Coaching (Week 7-10)**
- Goal setting system
- AI insights engine
- Coaching recommendations
- Progress tracking

### Monitoring and Metrics

**Technical Metrics**:
- Weather API success rate
- Sync performance with enrichment
- Dashboard load times
- AI insight generation accuracy

**User Engagement Metrics**:
- Goal setting adoption rate
- Insight interaction rates
- Feature usage patterns
- User retention improvements

This design transforms RunSight from a basic activity viewer into a comprehensive, AI-powered running analytics platform that provides real value through weather insights, performance analytics, and personalized coaching.