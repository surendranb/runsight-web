# Project Structure

## Root Level
- `index.html` - Main HTML entry point
- `package.json` - Dependencies and npm scripts
- `vite.config.ts` - Vite build configuration
- `netlify.toml` - Netlify deployment configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `.env.example` - Environment variables template

## Source Code (`src/`)
- `main.tsx` - React application entry point
- `SecureApp.tsx` - Main application component with auth and routing
- `index.css` - Global styles and Tailwind imports

### Components (`src/components/`)
- `NavigationBar.tsx` - Top navigation with sync controls and view switching
- `ModernDashboard.tsx` - Primary dashboard with KPIs, charts, and timeline (replaces SimpleDashboard)
- `SimpleDashboard.tsx` - Legacy dashboard (kept for compatibility)
- `InsightsPage.tsx` - Advanced analytics hub with 10+ insights
- `GoalsPage.tsx` - Goals tracking page (placeholder, database ready)
- `SecureStravaCallback.tsx` - OAuth callback handler
- `DebugConsole.tsx` - Development debugging tool with keyboard shortcut
- `AICoachSetup.tsx` - AI coach configuration interface
- `AIInsights.tsx` - AI-powered insights and recommendations

#### Dashboard Components (`src/components/dashboard/`)
- `KeyPerformanceCard.tsx` - KPI cards with metrics and trends
- `PaceTrendChart.tsx` - Interactive pace trend visualization
- `ActivityTimeline.tsx` - Chronological activity timeline
- `InsightCard.tsx` - Reusable insight display component

#### Insights Components (`src/components/insights/`)
- `ConsistencyInsight.tsx` - Running consistency analysis
- `ElevationEffortInsight.tsx` - Elevation and effort correlation
- `PerformanceWeatherInsight.tsx` - Weather impact on performance
- `TimeOfDayInsight.tsx` - Time-based performance patterns
- `WindPerformanceInsight.tsx` - Wind conditions analysis
- `WorkoutTypePerformanceInsight.tsx` - Workout type comparisons
- `PersonalRecordsInsight.tsx` - Personal records tracking
- `LocationIntelligenceInsight.tsx` - Route and location analysis
- `AdvancedPerformanceInsight.tsx` - Advanced performance metrics
- `MonthlySummaryTable.tsx` - Monthly statistics table

### Hooks (`src/hooks/`)
- `useSecureAuth.ts` - Authentication state management

### Library (`src/lib/`)
- `secure-api-client.ts` - API client for backend communication with progress tracking
- `auth-manager.ts` - Authentication utilities and token management
- `database.ts` - Database connection and queries
- `sync-orchestrator.ts` - Robust data synchronization logic with error handling
- `sync-state-manager.ts` - Sync state tracking and progress management
- `strava-client.ts` - Strava API integration with rate limiting
- `weather-enricher.ts` - Weather data enrichment via OpenWeatherMap
- `transformers.ts` - Data transformation utilities
- `validation.ts` - Input validation helpers
- `data-storer.ts` - Data storage and persistence utilities
- `errors.ts` - Error definitions and handling
- `insightsUtils.ts` - General insights calculation utilities
- `outlierDetection.ts` - Statistical outlier detection and filtering
- `ai-coach-client.ts` - AI coach integration and API client

#### Debug Utilities (`src/lib/debug/`)
- `debug-logger.ts` - Comprehensive logging utilities
- `error-analyzer.ts` - Error analysis and categorization
- `error-handler.ts` - Centralized error handling with user-friendly messages

#### Insights Utilities (`src/lib/insights/`)
- `consistencyUtils.ts` - Consistency calculation helpers
- `elevationEffortUtils.ts` - Elevation analysis utilities
- `timeOfDayUtils.ts` - Time-based analysis helpers
- `weatherPerformanceUtils.ts` - Weather correlation utilities
- `windPerformanceUtils.ts` - Wind analysis helpers
- `workoutTypeUtils.ts` - Workout type analysis
- `personalRecordsUtils.ts` - Personal records tracking and analysis
- `locationIntelligenceUtils.ts` - Location and route analysis
- `advancedPerformanceUtils.ts` - Advanced performance metrics calculation

#### Testing (`src/lib/__tests__/`)
- `sync-state-manager.test.ts` - Unit tests for sync state management

### Types (`src/types/`)
- `index.ts` - Core application types (User, Run, EnrichedRun, etc.)
- `sync.ts` - Synchronization-related types

## Backend (`netlify/functions/`)
- `auth-strava.js` - Strava OAuth authentication with secure token handling
- `get-runs.js` - Fetch user runs from database with filtering and pagination
- `sync-data.js` - Robust data synchronization endpoint with progress tracking
- `ai-coach.js` - AI coach integration endpoint for insights and recommendations

## Database (`supabase/migrations/`)
- Migration files for database schema evolution
- Key migrations:
  - `20250609100000_fresh_start_simple_schema.sql` - Core runs table schema
  - `20250609110000_add_proper_rls_security.sql` - Row Level Security implementation
  - `20250610200000_add_geocoding_columns.sql` - Location data enhancements
  - `20250717000000_create_goals_table.sql` - Goals system database schema

## Archive (`archive/`)
- Reserved for future historical artifacts (currently minimal)

## Development Files
- `.kiro/` - Kiro AI assistant configuration and specs
- `.vscode/` - VS Code workspace settings
- `scripts/` - Build and utility scripts
- `node_modules/` - npm dependencies (generated)

## Key Architectural Patterns
- **Component-based**: React functional components with hooks and modern patterns
- **Type-safe**: Full TypeScript coverage with strict type checking
- **Serverless**: Netlify Functions for backend logic with zero credential exposure
- **Database-first**: Supabase with Row Level Security (RLS) for user data isolation
- **Modular**: Clear separation of concerns with dedicated utility modules
- **Error-resilient**: Comprehensive error handling and user-friendly error messages
- **Performance-optimized**: Outlier detection, data filtering, and efficient rendering
- **Extensible**: Well-structured for adding new insights and features