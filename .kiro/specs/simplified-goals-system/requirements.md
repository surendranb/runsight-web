# Simplified Goals System - Requirements

## Introduction

The current goals system is overly complex with too many goal types, complex templates, and a hardcoded static goal display on the dashboard. We need to completely rebuild it with a simplified, user-friendly approach that focuses on the three most important goal types for runners: distance goals, pace goals, and number of runs goals.

## Core Vision

**"Simple, actionable goal tracking that motivates runners"**

The goals system should be:
- Easy to set up with dropdowns instead of free text
- Simple to understand and track progress
- Robust in calculation and data handling
- Enhanced by AI coaching insights

## Requirements

### Requirement 1: Remove Static Hardcoded Goal Display

**User Story:** As a user, I don't want to see a hardcoded "2025 Distance Goal" on my dashboard when I haven't set any goals.

#### Acceptance Criteria

1. WHEN I view the dashboard AND I have no goals set THEN I SHALL NOT see any goal progress bars or static goal displays
2. WHEN I view the dashboard AND I have active goals THEN I SHALL see my actual goal progress displayed dynamically
3. WHEN I view the dashboard THEN all goal displays SHALL be based on real data from the database, not hardcoded values

### Requirement 2: Simplified Goal Types (Only 3 Types)

**User Story:** As a runner, I want to set simple, clear goals that match my running objectives without complexity.

#### Acceptance Criteria

1. WHEN I create a goal THEN I SHALL be able to choose from exactly 3 goal types: Distance, Pace, and Number of Runs
2. WHEN I select Distance goal THEN I SHALL be able to set a target distance (e.g., 1000km) and timeframe (monthly/yearly)
3. WHEN I select Pace goal THEN I SHALL be able to choose a race distance (5K, 10K, Half Marathon, Marathon) and target time
4. WHEN I select Number of Runs goal THEN I SHALL be able to set a target number of runs and timeframe
5. WHEN I create any goal THEN all inputs SHALL be dropdown-based or structured inputs, not free text

### Requirement 3: Distance Goals

**User Story:** As a runner, I want to set distance goals like "Run 1000km this year" and track my progress automatically.

#### Acceptance Criteria

1. WHEN I create a distance goal THEN I SHALL select from preset distance options: 500km, 1000km, 1500km, 2000km, 2500km per year OR 50km, 100km, 150km, 200km per month
2. WHEN I create a distance goal THEN I SHALL select timeframe: This Year, This Month, or Custom Date Range
3. WHEN I view my distance goal THEN I SHALL see current progress calculated from all my runs within the goal timeframe
4. WHEN I view my distance goal THEN I SHALL see progress percentage, distance remaining, and projected completion date
5. WHEN my runs are synced THEN my distance goal progress SHALL update automatically

### Requirement 4: Pace Goals

**User Story:** As a runner, I want to set pace goals like "Run 5K under 25 minutes" and track my best attempts.

#### Acceptance Criteria

1. WHEN I create a pace goal THEN I SHALL select from race distances: 5K, 10K, Half Marathon (21K), Marathon (42K)
2. WHEN I create a pace goal THEN I SHALL select from common target times for each distance (e.g., 5K: 20min, 22min, 25min, 30min, 35min)
3. WHEN I view my pace goal THEN I SHALL see my current best time for that distance and how it compares to my target
4. WHEN I complete a run close to the goal distance THEN the system SHALL automatically check if it's a new personal record for that goal
5. WHEN I achieve my pace goal THEN the goal status SHALL automatically update to "completed"

### Requirement 5: Number of Runs Goals

**User Story:** As a runner, I want to set goals for consistency like "Run 100 times this year" and track my frequency.

#### Acceptance Criteria

1. WHEN I create a runs goal THEN I SHALL select from preset targets: 50, 100, 150, 200 runs per year OR 10, 15, 20, 25 runs per month
2. WHEN I create a runs goal THEN I SHALL select timeframe: This Year, This Month, or Custom Date Range
3. WHEN I view my runs goal THEN I SHALL see current count, target count, and runs remaining
4. WHEN I view my runs goal THEN I SHALL see average runs per week/month and projected completion
5. WHEN my runs are synced THEN my runs goal count SHALL update automatically

### Requirement 6: Smart Goal Creation Interface

**User Story:** As a user, I want goal creation to be intuitive with appropriate input methods for each goal type.

#### Acceptance Criteria

1. WHEN I click "Create Goal" THEN I SHALL see a modal with clear selections for goal type
2. WHEN I create a distance goal THEN I SHALL be able to enter custom distance amounts (e.g., 2500km) with timeframe dropdowns
3. WHEN I create a pace goal THEN I SHALL use dropdowns for race distance (5K, 10K, Half, Marathon) and common target times (e.g., 8:30, 9:00)
4. WHEN I create a runs goal THEN I SHALL be able to enter custom run counts with timeframe dropdowns
5. WHEN I select dropdown options THEN they SHALL show common/popular choices but allow flexibility where needed
6. WHEN I submit the goal form THEN all data SHALL be validated and stored correctly in the database

### Requirement 7: Robust Progress Calculation with Data Quality

**User Story:** As a user, I want my goal progress to be calculated accurately based on my actual running data, excluding GPS errors and data anomalies.

#### Acceptance Criteria

1. WHEN I have a distance goal THEN progress SHALL be calculated by summing all valid run distances within the goal timeframe
2. WHEN I have a pace goal THEN progress SHALL be calculated by finding my best time for runs near the target distance (±10%), excluding outlier performances
3. WHEN I have a runs goal THEN progress SHALL be calculated by counting all valid runs within the goal timeframe
4. WHEN goal progress is calculated THEN it SHALL exclude data outliers: runs with pace faster than 2:30/km or slower than 12:00/km
5. WHEN goal progress is calculated THEN it SHALL exclude runs shorter than 0.5km or longer than 200km to filter GPS errors
6. WHEN goal progress is calculated THEN it SHALL handle edge cases like leap years, month boundaries, and timezone differences
7. WHEN goal progress is displayed THEN it SHALL show accurate percentages, remaining values, and time estimates based on clean data

### Requirement 8: Enhanced AI Coach Integration

**User Story:** As a runner, I want the AI Coach to provide specific, actionable advice based on my simplified goals.

#### Acceptance Criteria

1. WHEN I have distance goals THEN the AI Coach SHALL provide weekly distance targets and pacing advice
2. WHEN I have pace goals THEN the AI Coach SHALL suggest specific workouts (intervals, tempo runs) to improve my target pace
3. WHEN I have runs goals THEN the AI Coach SHALL provide consistency tips and motivation for maintaining frequency
4. WHEN I'm behind on any goal THEN the AI Coach SHALL provide specific "course correction" recommendations
5. WHEN I'm ahead of schedule THEN the AI Coach SHALL suggest ways to maintain momentum or set stretch targets

### Requirement 9: Database Schema Alignment

**User Story:** As a developer, I want the goals system to properly use the existing database schema and handle data types correctly.

#### Acceptance Criteria

1. WHEN goals are stored THEN they SHALL use the existing `goals` table schema with proper data types
2. WHEN distance goals are stored THEN `target_value` SHALL be in meters, `unit` SHALL be 'meters'
3. WHEN pace goals are stored THEN `target_value` SHALL be in seconds, `unit` SHALL be 'seconds', and `additional_details` SHALL contain race distance
4. WHEN runs goals are stored THEN `target_value` SHALL be integer count, `unit` SHALL be 'runs'
5. WHEN goals are queried THEN the system SHALL handle all database operations through Supabase MCP integration

### Requirement 10: Clean Dashboard Integration

**User Story:** As a user, I want my dashboard to show my actual goals dynamically, not static placeholders.

#### Acceptance Criteria

1. WHEN I have no goals THEN the dashboard SHALL show a clean interface without goal sections
2. WHEN I have active goals THEN the dashboard SHALL display a summary of my most important goal
3. WHEN I have multiple goals THEN the dashboard SHALL prioritize showing the highest priority or most urgent goal
4. WHEN goal progress updates THEN the dashboard display SHALL reflect changes immediately
5. WHEN I click on goal information in the dashboard THEN I SHALL be taken to the full Goals page