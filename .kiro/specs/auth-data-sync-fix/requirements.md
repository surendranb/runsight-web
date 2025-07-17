# Authentication and Data Sync Fix Requirements

## Introduction

The application currently has a critical bug where users can successfully authenticate with Strava but then fail to sync data because their user record is not properly created or accessible in the database. The authentication flow creates a user in Supabase Auth, but the sync functions expect user data in a separate `users` table that may not exist or be properly populated.

## Requirements

### Requirement 1: Fix User Data Persistence

**User Story:** As a user, I want my authentication to properly create all necessary database records so that data sync works immediately after login.

#### Acceptance Criteria

1. WHEN a user completes Strava OAuth THEN the system SHALL create or update both the Supabase Auth user AND a corresponding record in the application's user data table
2. WHEN the auth-strava function processes a successful OAuth callback THEN it SHALL ensure the user record exists in the `users` table with all required Strava tokens
3. IF the `users` table doesn't exist THEN the system SHALL create it with the proper schema
4. WHEN a user record is created or updated THEN it SHALL include strava_access_token, strava_refresh_token, strava_id, and other necessary fields

### Requirement 2: Fix Database Schema Consistency

**User Story:** As a developer, I want the database schema to be consistent so that all functions can reliably access user data.

#### Acceptance Criteria

1. WHEN the application starts THEN the database SHALL have a `users` table that matches what the sync functions expect
2. WHEN examining the database schema THEN the `users` table SHALL exist alongside the `runs` table
3. WHEN the sync functions query for user data THEN they SHALL find the user record with valid Strava tokens
4. IF there are schema mismatches between migrations THEN they SHALL be resolved to ensure consistency

### Requirement 3: Improve Sync Function Error Handling

**User Story:** As a user, I want clear error messages when sync fails so I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN sync functions cannot find a user THEN they SHALL provide specific error messages indicating the root cause
2. WHEN Strava tokens are missing or invalid THEN the system SHALL guide the user to re-authenticate
3. WHEN database connection issues occur THEN the system SHALL distinguish between user errors and system errors
4. WHEN sync fails THEN the error messages SHALL be logged with sufficient detail for debugging

### Requirement 4: Ensure Immediate Post-Login Sync

**User Story:** As a user, I want to be able to sync my data immediately after logging in without additional authentication steps.

#### Acceptance Criteria

1. WHEN a user completes the OAuth callback THEN they SHALL be able to immediately trigger a data sync
2. WHEN the callback processing includes an automatic sync THEN it SHALL succeed without "user not found" errors
3. WHEN a user's first sync occurs THEN it SHALL fetch and store their recent Strava activities
4. WHEN sync completes successfully THEN the user SHALL see their running data in the dashboard

### Requirement 5: Handle Legacy Data and Migration

**User Story:** As a system administrator, I want existing users to continue working after schema fixes are applied.

#### Acceptance Criteria

1. WHEN schema fixes are applied THEN existing authenticated users SHALL continue to work without re-authentication
2. WHEN the `users` table is created or modified THEN existing user data SHALL be preserved or migrated appropriately
3. WHEN users who were affected by the bug try to sync THEN their user records SHALL be automatically created from their auth metadata
4. WHEN the system detects missing user records for authenticated users THEN it SHALL attempt to recreate them from available data

### Requirement 6: Validate Environment Configuration

**User Story:** As a developer, I want to ensure all required environment variables are properly configured for the authentication and sync flow.

#### Acceptance Criteria

1. WHEN the auth-strava function runs THEN all required Supabase environment variables SHALL be available
2. WHEN sync functions run THEN they SHALL have access to both VITE_ prefixed and service key environment variables
3. WHEN environment variables are missing THEN the functions SHALL provide clear error messages indicating which variables are needed
4. WHEN functions start THEN they SHALL validate their environment configuration and fail fast if misconfigured