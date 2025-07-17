# Implementation Plan

- [x] 1. Create clean database schema
  - Drop all existing tables (runs, sync_sessions, any others)
  - Create simple `user_tokens` table for storing Strava authentication
  - Create simple `runs` table for storing activity data
  - Add basic indexes for performance
  - _Requirements: 1.1, 1.2, 4.1, 4.2_

- [x] 2. Create simplified auth-strava function
  - Simplify OAuth flow to store tokens directly in `user_tokens` table
  - Remove complex UUID generation and Supabase Auth integration
  - Store Strava user ID, tokens, and basic user info
  - Return simple success response with user data
  - _Requirements: 2.1, 2.2, 5.1, 5.2_

- [x] 3. Create new simple sync function
  - Create `netlify/functions/sync-data.js` to replace complex sync orchestrator
  - Fetch tokens from `user_tokens` table using Strava user ID
  - Fetch activities directly from Strava API
  - Store activities directly in `runs` table with upsert logic
  - _Requirements: 3.1, 3.2, 5.3_

- [x] 4. Create simple get-runs function
  - Create `netlify/functions/get-runs.js` to replace complex get-user-runs
  - Query runs directly from `runs` table
  - Calculate basic statistics (total runs, distance, etc.)
  - Return data in format expected by frontend
  - _Requirements: 3.1, 3.4, 5.4_

- [x] 5. Update frontend to use simplified API
  - Update authentication flow to use new simplified auth endpoint
  - Update sync calls to use new sync-data function
  - Update data fetching to use new get-runs function
  - Remove complex user ID management and use simple Strava user ID
  - _Requirements: 2.4, 3.2, 3.4_

- [x] 6. Add token refresh logic
  - Implement automatic Strava token refresh when tokens expire
  - Update stored tokens in `user_tokens` table after refresh
  - Handle refresh failures gracefully with re-authentication prompt
  - Test token refresh flow with expired tokens
  - _Requirements: 2.3, 3.3_

- [x] 7. Add basic error handling and logging
  - Implement clear error messages for common scenarios
  - Add logging for debugging without exposing sensitive data
  - Handle network failures and API rate limits gracefully
  - Provide actionable error messages to user
  - _Requirements: 3.3, 5.1_

- [x] 8. Remove old complex functions and code
  - Delete `netlify/functions/sync-orchestrator.js`
  - Delete `netlify/functions/get-user-runs.js`
  - Delete `netlify/functions/simple-sync.js`
  - Clean up any unused frontend code related to complex auth
  - _Requirements: 4.3, 5.2_

- [x] 9. Test complete simplified flow
  - Test fresh authentication with Strava OAuth
  - Test immediate sync after authentication
  - Test data display in dashboard
  - Test re-sync with existing data (upsert logic)
  - _Requirements: 1.4, 2.4, 3.1, 3.2_

- [ ] 10. Deploy and validate production flow
  - Deploy new database schema to production
  - Deploy new simplified functions to Netlify
  - Test complete user flow from authentication to dashboard
  - Verify sync works reliably and data displays correctly
  - _Requirements: 4.4, 5.4_