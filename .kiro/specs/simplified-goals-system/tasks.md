# Simplified Goals System - Implementation Plan

## Phase 1: Remove Static Goal Display and Clean Up

- [x] 1. Remove hardcoded goal display from ModernDashboard
  - Remove the static "2025 Distance Goal" section from ModernDashboard.tsx
  - Clean up any hardcoded goal-related calculations in dashboard metrics
  - Ensure dashboard shows clean interface when no goals exist
  - Test dashboard display with and without goals
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Clean up existing goals codebase
  - Remove complex goal types and templates from goalTypes.ts
  - Remove unused goal calculation functions from goalUtils.ts
  - Remove complex goal templates from goalTemplates.ts
  - Clean up any console.log statements in goal-related files
  - _Requirements: 2.1, 9.1_

## Phase 2: Create Simplified Goal Types and Dropdown Options

- [x] 3. Define simplified goal types and interfaces
  - Create new simplified Goal interface with only 3 types: distance, pace, runs
  - Define DistanceGoal, PaceGoal, and RunsGoal interfaces
  - Create dropdown option constants for each goal type
  - Add proper TypeScript types for all dropdown selections
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4. Create dropdown configuration system
  - Define DISTANCE_OPTIONS with preset yearly/monthly targets
  - Define PACE_OPTIONS with race distances and target times
  - Define RUNS_OPTIONS with preset yearly/monthly targets
  - Add difficulty indicators for each option
  - Create helper functions to generate goal titles from selections
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

## Phase 3: Build Dropdown-Based Goal Creation

- [x] 5. Create new CreateGoalModal component
  - Build step-by-step goal creation flow with dropdowns
  - Step 1: Select goal type (distance/pace/runs)
  - Step 2: Select specific options based on type
  - Step 3: Select timeframe and priority
  - Step 4: Review and submit
  - _Requirements: 6.1, 6.2, 6.6_

- [x] 6. Implement goal creation form logic
  - Handle dynamic form updates based on goal type selection
  - Validate all dropdown selections
  - Auto-generate goal titles and descriptions from selections
  - Implement form submission with proper error handling
  - _Requirements: 6.3, 6.4, 6.5, 6.6_

## Phase 4: Implement Robust Progress Calculation

- [ ] 7. Create GoalCalculator class
  - Implement calculateDistanceProgress method
  - Implement calculatePaceProgress method with distance tolerance
  - Implement calculateRunsProgress method
  - Add proper date/time handling for goal timeframes
  - Handle edge cases (leap years, month boundaries, timezones)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 8. Add progress tracking utilities
  - Create filterRunsByTimeframe utility function
  - Add calculateOnTrackStatus logic
  - Implement projectedCompletion calculations
  - Add progress validation and error handling
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

## Phase 5: Integrate Supabase MCP for Database Operations

- [ ] 9. Set up Supabase MCP integration
  - Configure Supabase MCP connection
  - Test database connectivity and permissions
  - Verify goals table schema compatibility
  - Set up proper error handling for database operations
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 10. Implement goal database operations
  - Create createGoal function using Supabase MCP
  - Create getUserGoals function using Supabase MCP
  - Create updateGoal function using Supabase MCP
  - Create deleteGoal function using Supabase MCP
  - Add proper data type handling for each goal type
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

## Phase 6: Enhanced AI Coach Integration

- [ ] 11. Create AICoachGoals class
  - Implement generateDistanceAdvice method
  - Implement generatePaceAdvice method with specific workout suggestions
  - Implement generateRunsAdvice method with consistency tips
  - Add course correction logic for behind-schedule goals
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 12. Integrate AI coach with goal progress
  - Connect AI coach advice to goal progress calculations
  - Display AI recommendations in goal cards
  - Add contextual advice based on goal status
  - Implement motivational messages for achieved goals
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

## Phase 7: Update Goals Page and Dashboard Integration

- [ ] 13. Rebuild GoalsPage component
  - Replace existing goals page with simplified version
  - Integrate new CreateGoalModal component
  - Display goals using new progress calculation system
  - Add proper loading states and error handling
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 14. Add dynamic goal display to dashboard
  - Create dynamic goal progress component for dashboard
  - Show most important/urgent goal when goals exist
  - Handle multiple goals with proper prioritization
  - Link dashboard goal display to Goals page
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

## Phase 8: Testing and Validation

- [ ] 15. Test goal creation workflow
  - Test all 3 goal types creation with dropdowns
  - Verify goal data is stored correctly in database
  - Test goal title and description auto-generation
  - Validate all dropdown options work correctly
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 16. Test progress calculation accuracy
  - Test distance goal progress with various run data
  - Test pace goal progress with different race distances
  - Test runs goal progress with different timeframes
  - Verify edge cases (leap years, month boundaries) work correctly
  - Test progress updates when new runs are synced
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 17. Test AI coach integration
  - Verify AI advice is relevant for each goal type
  - Test course correction recommendations for behind-schedule goals
  - Test motivational messages for on-track and completed goals
  - Validate AI coach setup and configuration flow
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 18. Test dashboard and goals page integration
  - Test dashboard shows no goals when none exist
  - Test dashboard shows dynamic goal progress when goals exist
  - Test navigation between dashboard and goals page
  - Verify goal progress updates reflect immediately
  - Test responsive design on different screen sizes
  - _Requirements: 1.1, 1.2, 1.3, 10.1, 10.2, 10.3, 10.4, 10.5_

## Phase 9: Production Deployment and Validation

- [ ] 19. Clean up and optimize code
  - Remove all console.log statements
  - Optimize bundle size and performance
  - Add proper error boundaries and fallbacks
  - Ensure all TypeScript types are correct
  - _Requirements: All_

- [ ] 20. Deploy and validate in production
  - Commit changes with clear, succinct messages
  - Push to trigger Netlify deployment
  - Test complete workflow in production environment
  - Verify Supabase MCP integration works in production
  - Validate all goal types work correctly with real user data
  - _Requirements: All_