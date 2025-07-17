# Implementation Plan

- [ ] 1. Update sync-orchestrator function to use auth.users
  - Modify the user lookup query to use `supabase.auth.admin.getUserById()` instead of querying `public.users`
  - Extract Strava tokens from `raw_user_meta_data` field
  - Update error handling to provide specific messages for auth vs database errors
  - Test the function with the existing authenticated user (642576a5-f2dd-55f9-93b0-8662b69043c5)
  - _Requirements: 1.1, 1.2, 3.1, 3.2_

- [ ] 2. Update simple-sync function to use auth.users
  - Replace `supabase.from('users')` query with `supabase.auth.admin.getUserById()`
  - Update token extraction logic to handle `raw_user_meta_data` structure
  - Improve error messages for missing tokens and authentication failures
  - Add environment variable validation at function startup
  - _Requirements: 1.1, 1.2, 3.1, 6.1, 6.3_

- [ ] 3. Verify and update auth-strava function metadata handling
  - Check if the function uses correct metadata field names (`raw_user_meta_data` vs `user_metadata`)
  - Ensure token storage format matches what sync functions expect
  - Validate that user creation/update works correctly with the current Supabase setup
  - Test the complete OAuth flow to ensure metadata is properly stored
  - _Requirements: 1.1, 1.4, 5.3_

- [ ] 4. Update get-user-runs function if needed
  - Check if this function accesses user data directly (it may only access runs data)
  - If it needs user data, update it to use `auth.users` instead of `public.users`
  - Ensure it can handle the user data structure correctly
  - Test data retrieval and transformation functions
  - _Requirements: 1.1, 1.2_

- [ ] 5. Add comprehensive error handling and validation
  - Implement specific error codes for different failure scenarios (AUTH_REQUIRED, TOKEN_MISSING, CONFIG_ERROR)
  - Add environment variable validation in all functions
  - Improve user-facing error messages to guide users on next steps
  - Add detailed logging for debugging while protecting sensitive data
  - _Requirements: 3.1, 3.2, 3.3, 6.3_

- [ ] 6. Test the complete authentication and sync flow
  - Test with the existing authenticated user (642576a5-f2dd-55f9-93b0-8662b69043c5)
  - Verify that login → sync → dashboard flow works end-to-end
  - Test different sync time periods (14 days, 30 days, all time)
  - Validate that run data appears correctly in the dashboard
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 7. Validate database permissions and access
  - Ensure Netlify functions have proper permissions to access `auth.users` with service key
  - Test that the service key environment variable is correctly configured
  - Verify that user data can be accessed without RLS (Row Level Security) issues
  - Check that the functions can read user metadata without permission errors
  - _Requirements: 1.1, 1.3, 6.1, 6.2_

- [ ] 8. Add token refresh logic for expired Strava tokens
  - Implement logic to detect expired Strava access tokens
  - Add automatic token refresh using the refresh token
  - Update user metadata with new tokens after refresh
  - Handle refresh token expiration scenarios gracefully
  - _Requirements: 3.2, 5.4_

- [ ] 9. Implement sync progress tracking and resumability
  - Ensure sync functions properly use the existing `sync_sessions` table
  - Add checkpointing for large sync operations
  - Implement resume logic for interrupted syncs
  - Add cleanup for stuck or abandoned sync sessions
  - _Requirements: 4.1, 4.2_

- [ ] 10. Deploy and validate the complete fix
  - Deploy all updated functions to Netlify
  - Test the complete user flow with the existing authenticated user
  - Monitor function logs for any remaining errors
  - Verify that the "user not found" error is resolved
  - Confirm that data sync and dashboard display work correctly
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2_