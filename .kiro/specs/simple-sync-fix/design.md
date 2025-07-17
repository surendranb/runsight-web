# Simple Sync Fix Design

## Overview

We're completely simplifying the architecture to match the reality: this is a personal running analytics app for a single user. No complex multi-tenant architecture, no UUID juggling, no complex sync orchestration. Just: authenticate → sync → view data.

## Architecture

### Current Complex Architecture (Problems)
```
User Auth → UUID Generation → Complex Metadata → Multiple Tables → Sync Orchestration → Dashboard
```

### New Simple Architecture (Solution)
```
Strava Auth → Store Tokens → Fetch Activities → Store in Runs Table → Dashboard
```

## Components and Interfaces

### 1. Simplified Database Schema

**Drop Everything and Create Clean Schema:**
```sql
-- Drop all existing tables
DROP TABLE IF EXISTS public.runs CASCADE;
DROP TABLE IF EXISTS public.sync_sessions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.enriched_runs CASCADE;

-- Create simple runs table
CREATE TABLE public.runs (
  id SERIAL PRIMARY KEY,
  strava_id BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  distance_meters REAL NOT NULL,
  moving_time_seconds INTEGER NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  start_date_local TIMESTAMPTZ NOT NULL,
  start_latitude REAL,
  start_longitude REAL,
  average_speed_ms REAL,
  average_heartrate_bpm INTEGER,
  total_elevation_gain_meters REAL,
  strava_data JSONB,
  weather_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create simple user_tokens table for auth
CREATE TABLE public.user_tokens (
  id SERIAL PRIMARY KEY,
  strava_user_id BIGINT UNIQUE NOT NULL,
  strava_access_token TEXT NOT NULL,
  strava_refresh_token TEXT NOT NULL,
  strava_expires_at BIGINT NOT NULL,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Simplified Authentication Flow

**New Auth Process:**
1. User clicks "Connect with Strava"
2. Strava OAuth redirects back with code
3. Exchange code for tokens
4. Store tokens in `user_tokens` table
5. Done - user is authenticated

**No More:**
- UUID generation functions
- Complex metadata storage
- Supabase Auth integration
- Multiple user management systems

### 3. Direct Sync Process

**New Sync Flow:**
```javascript
// Simple sync function
async function syncStravaData() {
  // 1. Get tokens from user_tokens table
  const tokens = await getStoredTokens();
  
  // 2. Fetch activities from Strava
  const activities = await fetchStravaActivities(tokens.access_token);
  
  // 3. Store directly in runs table
  for (const activity of activities) {
    await upsertRun(activity);
  }
  
  // 4. Done!
  return { success: true, count: activities.length };
}
```

### 4. Simplified Functions

**Updated Netlify Functions:**

1. **auth-strava.js** - Simplified to just handle OAuth and store tokens
2. **sync-data.js** - New simple sync function
3. **get-runs.js** - Simple query from runs table
4. **Remove** - sync-orchestrator.js, get-user-runs.js (too complex)

## Data Models

### User Tokens Table
```javascript
{
  id: 1,
  strava_user_id: 20683290,
  strava_access_token: "abc123...",
  strava_refresh_token: "def456...",
  strava_expires_at: 1752684887,
  user_name: "Surendran Balachandran",
  created_at: "2025-01-16T...",
  updated_at: "2025-01-16T..."
}
```

### Runs Table
```javascript
{
  id: 1,
  strava_id: 12345678,
  name: "Morning Run",
  distance_meters: 5000,
  moving_time_seconds: 1800,
  start_date: "2025-01-16T06:00:00Z",
  start_date_local: "2025-01-16T11:30:00+05:30",
  start_latitude: 12.9716,
  start_longitude: 77.5946,
  average_speed_ms: 2.78,
  average_heartrate_bpm: 150,
  total_elevation_gain_meters: 50,
  strava_data: { /* full strava activity object */ },
  weather_data: { /* weather info if available */ },
  created_at: "2025-01-16T...",
  updated_at: "2025-01-16T..."
}
```

## Error Handling

### Simple Error Scenarios
1. **Not authenticated** → "Please connect with Strava"
2. **Token expired** → Auto-refresh or "Please re-authenticate"
3. **Sync failed** → "Failed to sync: [specific reason]"
4. **No data** → "No runs found, try syncing first"

### No More Complex Errors
- No "user not found in database"
- No "UUID generation failed"
- No "metadata extraction failed"
- No "sync orchestration failed"

## Testing Strategy

### Simple Test Cases
1. **Fresh start** → Auth → Sync → View data
2. **Re-sync** → Should update existing runs
3. **Token refresh** → Should work automatically
4. **Error recovery** → Clear error messages

### Manual Testing
1. Drop all tables
2. Deploy new functions
3. Authenticate with Strava
4. Sync data
5. View in dashboard
6. Done!

## Migration Strategy

### Phase 1: Clean Slate (Immediate)
1. **Drop all existing tables** in Supabase
2. **Create new simple schema**
3. **Deploy new simplified functions**
4. **Test complete flow**

### Phase 2: No Migration Needed
- Since we're dropping everything, no data migration
- User just needs to re-authenticate (one time)
- Much cleaner than trying to fix complex schema

## Security Considerations

### Simplified Security
- Store tokens in database (encrypted at rest by Supabase)
- Use HTTPS for all API calls
- Simple rate limiting on sync functions
- No complex user isolation needed (single user)

### Removed Complexity
- No RLS policies needed
- No complex auth flows
- No UUID security concerns
- No multi-tenant isolation

## Performance Considerations

### Optimized for Single User
- Simple queries without complex joins
- Direct table access
- No user filtering overhead
- Minimal function complexity

### Monitoring
- Simple success/failure metrics
- Basic sync timing
- Error rate monitoring
- No complex orchestration metrics

## Deployment Plan

### Simple Deployment
1. **Update database schema** (drop and recreate)
2. **Deploy new functions** to Netlify
3. **Test authentication flow**
4. **Test sync and dashboard**
5. **Done!**

### Rollback Plan
- Keep current functions as backup
- Can restore database from backup if needed
- Simple to redeploy if issues arise

## Benefits of Simplified Approach

### For Development
- **Easier to debug** - fewer moving parts
- **Faster to modify** - simple schema and functions
- **Less error-prone** - straightforward logic
- **Better performance** - optimized queries

### For User Experience
- **More reliable** - fewer failure points
- **Faster sync** - direct operations
- **Clearer errors** - simple error messages
- **Consistent behavior** - predictable flow

### For Maintenance
- **Easier updates** - simple codebase
- **Faster troubleshooting** - clear data flow
- **Simpler monitoring** - basic metrics
- **Lower complexity** - fewer dependencies