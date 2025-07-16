# Simple Sync Fix Requirements

## Goal
Make the Strava data sync work without errors.

## Current Problem
Users get "Failed to execute 'json' on 'Response': Unexpected end of JSON input" when trying to sync.

## Requirements

### Requirement 1
**User Story:** As a user, I want to click "Start Sync" and have it work without errors.

#### Acceptance Criteria
1. WHEN user clicks "Start Sync" THEN the system SHALL return valid JSON response
2. WHEN sync completes THEN user SHALL see success message
3. WHEN sync fails THEN user SHALL see clear error message (not JSON parsing error)

### Requirement 2
**User Story:** As a user, I want to see my Strava activities after sync completes.

#### Acceptance Criteria
1. WHEN sync completes successfully THEN activities SHALL appear in dashboard
2. WHEN activities are displayed THEN they SHALL include basic run data (distance, time, date)