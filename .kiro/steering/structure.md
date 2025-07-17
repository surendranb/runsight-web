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
- `NavigationBar.tsx` - Top navigation with sync controls
- `SimpleDashboard.tsx` - Main dashboard view
- `InsightsPage.tsx` - Advanced analytics page
- `SecureStravaCallback.tsx` - OAuth callback handler
- `DebugConsole.tsx` - Development debugging tool

#### Insights Components (`src/components/insights/`)
- `ConsistencyInsight.tsx` - Running consistency analysis
- `ElevationEffortInsight.tsx` - Elevation and effort correlation
- `PerformanceWeatherInsight.tsx` - Weather impact on performance
- `TimeOfDayInsight.tsx` - Time-based performance patterns
- `WindPerformanceInsight.tsx` - Wind conditions analysis
- `WorkoutTypePerformanceInsight.tsx` - Workout type comparisons
- `MonthlySummaryTable.tsx` - Monthly statistics table

### Hooks (`src/hooks/`)
- `useSecureAuth.ts` - Authentication state management

### Library (`src/lib/`)
- `secure-api-client.ts` - API client for backend communication
- `auth-manager.ts` - Authentication utilities
- `database.ts` - Database connection and queries
- `sync-orchestrator.ts` - Data synchronization logic
- `sync-state-manager.ts` - Sync state tracking
- `strava-client.ts` - Strava API integration
- `weather-enricher.ts` - Weather data enrichment
- `transformers.ts` - Data transformation utilities
- `validation.ts` - Input validation helpers

#### Debug Utilities (`src/lib/debug/`)
- `debug-logger.ts` - Logging utilities
- `error-analyzer.ts` - Error analysis and categorization
- `error-handler.ts` - Centralized error handling

#### Insights Utilities (`src/lib/insights/`)
- `consistencyUtils.ts` - Consistency calculation helpers
- `elevationEffortUtils.ts` - Elevation analysis utilities
- `timeOfDayUtils.ts` - Time-based analysis helpers
- `weatherPerformanceUtils.ts` - Weather correlation utilities
- `windPerformanceUtils.ts` - Wind analysis helpers
- `workoutTypeUtils.ts` - Workout type analysis

### Types (`src/types/`)
- `index.ts` - Core application types (User, Run, EnrichedRun, etc.)
- `sync.ts` - Synchronization-related types

## Backend (`netlify/functions/`)
- `auth-strava.js` - Strava OAuth authentication
- `get-runs.js` - Fetch user runs from database
- `sync-data.js` - Data synchronization endpoint

## Database (`supabase/migrations/`)
- Migration files for database schema evolution
- Latest: `20250609100000_fresh_start_simple_schema.sql` - Current schema

## Archive (`_archive/`)
- Historical code and documentation
- Previous implementations and experiments
- Troubleshooting guides and analysis documents

## Development Files
- `.kiro/` - Kiro AI assistant configuration and specs
- `.vscode/` - VS Code workspace settings
- `scripts/` - Build and utility scripts
- `node_modules/` - npm dependencies (generated)

## Key Architectural Patterns
- **Component-based**: React functional components with hooks
- **Type-safe**: Full TypeScript coverage
- **Serverless**: Netlify Functions for backend logic
- **Database-first**: Supabase with RLS for security
- **Modular**: Clear separation of concerns with dedicated utility modules