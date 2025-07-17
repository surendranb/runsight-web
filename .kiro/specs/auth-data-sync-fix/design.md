# Authentication and Data Sync Fix Design

## Overview

The root cause of the authentication and sync issue has been identified: the application's sync functions expect user data to be stored in a `public.users` table, but the actual user data is stored in Supabase's built-in `auth.users` table. The authentication flow correctly creates users in `auth.users` with Strava tokens stored in `raw_user_meta_data`, but the sync functions cannot access this data because they're querying the wrong table.

## Architecture

The current architecture has a mismatch between where user data is stored and where it's accessed:

**Current State:**
- Authentication: Stores user data in `auth.users.raw_user_meta_data`
- Sync Functions: Look for user data in `public.users` (doesn't exist)
- Result: "User not found" errors during sync

**Target State:**
- Authentication: Continue storing in `auth.users.raw_user_meta_data`
- Sync Functions: Access user data from `auth.users.raw_user_meta_data`
- Result: Seamless authentication and sync flow

## Components and Interfaces

### 1. Database Schema Updates

**Current Schema:**
```sql
-- Only these tables exist in public schema:
public.runs
public.sync_sessions

-- User data exists in:
auth.users (with raw_user_meta_data containing Strava tokens)
```

**Required Changes:**
- No new tables needed
- Update sync functions to query `auth.users` instead of `public.users`
- Ensure proper permissions for functions to access `auth.users`

### 2. Sync Function Updates

**Files to Update:**
- `netlify/functions/simple-sync.js`
- `netlify/functions/sync-orchestrator.js`
- `netlify/functions/get-user-runs.js` (if it accesses user data)

**Changes Required:**
```javascript
// OLD (incorrect):
const { data: userData, error: userError } = await supabase
  .from('users')  // This table doesn't exist
  .select('strava_access_token, strava_refresh_token, strava_id')
  .eq('id', userId)
  .single();

// NEW (correct):
const { data: userData, error: userError } = await supabase.auth.admin
  .getUserById(userId);
// Then extract tokens from userData.user.user_metadata or raw_user_meta_data
```

### 3. Authentication Function Validation

**File:** `netlify/functions/auth-strava.js`

**Current Behavior:** Creates/updates users in `auth.users` ✅ (This is correct)

**Validation Needed:**
- Ensure the function uses the correct metadata field name (`raw_user_meta_data` vs `user_metadata`)
- Verify token storage format matches what sync functions expect

### 4. Environment Configuration

**Required Environment Variables:**
- `VITE_SUPABASE_URL` ✅ (exists)
- `SUPABASE_SERVICE_KEY` ✅ (needed for admin operations)
- `VITE_STRAVA_CLIENT_ID` ✅ (exists)
- `VITE_STRAVA_CLIENT_SECRET` ✅ (exists)

## Data Models

### User Data Structure in auth.users

```json
{
  "id": "642576a5-f2dd-55f9-93b0-8662b69043c5",
  "email": "user_642576a5-f2dd-55f9-93b0-8662b69043c5@runsight.app",
  "raw_user_meta_data": {
    "name": "Surendran Balachandran",
    "strava_id": 20683290,
    "email_verified": true,
    "strava_expires_at": 1752684887,
    "strava_access_token": "cf8e261bf58975cbad68ac85b33094521ddbbc7b",
    "strava_refresh_token": "654b2dff29979ab3d4d0cf3d5467baab89b59dcf"
  }
}
```

### Expected Data Structure for Sync Functions

```javascript
// What sync functions expect:
{
  strava_access_token: "cf8e261bf58975cbad68ac85b33094521ddbbc7b",
  strava_refresh_token: "654b2dff29979ab3d4d0cf3d5467baab89b59dcf",
  strava_id: 20683290
}
```

## Error Handling

### Current Error Scenarios

1. **"User not found"**: Sync functions query non-existent `public.users` table
2. **"No access token"**: Even if user found, token extraction fails
3. **Environment misconfiguration**: Missing service keys for admin operations

### Improved Error Handling

1. **User Lookup Errors**:
   ```javascript
   if (userError) {
     if (userError.message.includes('User not found')) {
       return { error: 'Please re-authenticate with Strava', code: 'AUTH_REQUIRED' };
     }
     return { error: 'Database error', details: userError.message, code: 'DB_ERROR' };
   }
   ```

2. **Token Validation**:
   ```javascript
   const metadata = userData.user?.raw_user_meta_data || userData.user?.user_metadata;
   if (!metadata?.strava_access_token) {
     return { error: 'Strava token missing. Please re-authenticate.', code: 'TOKEN_MISSING' };
   }
   ```

3. **Environment Validation**:
   ```javascript
   const requiredEnvVars = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
   const missing = requiredEnvVars.filter(key => !process.env[key]);
   if (missing.length > 0) {
     return { error: 'Server configuration error', missing, code: 'CONFIG_ERROR' };
   }
   ```

## Testing Strategy

### Unit Tests
- Test user data extraction from `auth.users`
- Test token validation and error scenarios
- Test environment variable validation

### Integration Tests
- Test complete auth flow: OAuth → user creation → immediate sync
- Test sync with existing authenticated users
- Test error scenarios (missing tokens, expired tokens)

### Manual Testing Scenarios
1. **New User Flow**:
   - Fresh OAuth authentication
   - Immediate sync after authentication
   - Verify data appears in dashboard

2. **Existing User Flow**:
   - User who was affected by the bug
   - Should work after fix without re-authentication
   - Verify historical data sync

3. **Error Recovery**:
   - Expired Strava tokens
   - Network failures during sync
   - Partial sync completion

## Migration Strategy

### Phase 1: Fix Sync Functions (Immediate)
- Update all sync functions to use `auth.users` instead of `public.users`
- Deploy and test with existing authenticated user
- No database migrations needed

### Phase 2: Improve Error Handling
- Add comprehensive error handling and logging
- Improve user-facing error messages
- Add retry mechanisms for transient failures

### Phase 3: Validation and Monitoring
- Add health checks for sync functions
- Monitor sync success rates
- Add alerts for authentication failures

## Security Considerations

### Access Control
- Sync functions need `SUPABASE_SERVICE_KEY` to access `auth.users`
- Ensure service key is properly secured in Netlify environment
- Validate user ownership before accessing user data

### Token Security
- Strava tokens stored in `raw_user_meta_data` are encrypted at rest by Supabase
- Tokens transmitted over HTTPS only
- Implement token refresh logic for expired tokens

### Data Privacy
- Only access user's own data (validate userId matches authenticated user)
- Log minimal user information for debugging
- Respect Strava API rate limits and terms of service

## Performance Considerations

### Database Queries
- Use `supabase.auth.admin.getUserById()` for single user lookups
- Consider caching user metadata for repeated sync operations
- Monitor query performance and add indexes if needed

### API Rate Limits
- Strava API: 100 requests per 15 minutes, 1000 per day
- Implement exponential backoff for rate limit errors
- Queue sync requests during high usage periods

### Function Timeouts
- Netlify functions have 10-second timeout by default
- Break large syncs into smaller batches
- Use sync_sessions table to track progress and resume

## Deployment Plan

### Pre-deployment Validation
1. Verify user exists in `auth.users` with correct metadata structure
2. Test sync function changes in development environment
3. Validate environment variables in Netlify

### Deployment Steps
1. Deploy updated sync functions to Netlify
2. Test with existing authenticated user (642576a5-f2dd-55f9-93b0-8662b69043c5)
3. Monitor function logs for any remaining errors
4. Validate data sync and dashboard display

### Rollback Plan
- Keep previous function versions available
- Monitor error rates after deployment
- Quick rollback capability if issues arise

### Post-deployment Validation
1. Test complete user flow: auth → sync → dashboard
2. Verify sync functions can access user data
3. Confirm no "user not found" errors
4. Test with different sync time periods