# Simple Sync Fix Requirements

## Introduction

The current application has unnecessary complexity for a single-user personal running analytics app. Instead of fixing the complex multi-tenant architecture, we should simplify to a clean, straightforward approach that matches the actual use case.

## Requirements

### Requirement 1: Simplify Database Schema

**User Story:** As the sole user of this personal app, I want a simple database structure that just stores my running data without complex user management.

#### Acceptance Criteria

1. WHEN the database is reset THEN it SHALL have a simple `runs` table that stores all running data
2. WHEN I authenticate THEN my user ID SHALL be stored as a simple identifier without complex UUID generation
3. WHEN data is synced THEN it SHALL go directly into the runs table without complex orchestration
4. WHEN I view my dashboard THEN it SHALL read directly from the runs table

### Requirement 2: Simplify Authentication Flow

**User Story:** As the user, I want to authenticate with Strava once and have it work reliably without complex token management.

#### Acceptance Criteria

1. WHEN I authenticate with Strava THEN my tokens SHALL be stored in a simple, accessible way
2. WHEN sync runs THEN it SHALL easily access my Strava tokens without complex queries
3. WHEN tokens expire THEN the system SHALL handle refresh automatically
4. WHEN I'm authenticated THEN sync SHALL work immediately without "user not found" errors

### Requirement 3: Direct Sync Process

**User Story:** As the user, I want to sync my Strava data with a simple, reliable process that just works.

#### Acceptance Criteria

1. WHEN I trigger sync THEN it SHALL fetch my activities from Strava and store them directly
2. WHEN sync completes THEN I SHALL see my data in the dashboard immediately
3. WHEN sync encounters errors THEN they SHALL be clear and actionable
4. WHEN I sync multiple times THEN it SHALL handle duplicates gracefully

### Requirement 4: Clean Database Reset

**User Story:** As the developer, I want to start with a clean database that matches the simple architecture.

#### Acceptance Criteria

1. WHEN the database is reset THEN all existing tables SHALL be dropped cleanly
2. WHEN new schema is created THEN it SHALL match the simplified requirements
3. WHEN the app starts after reset THEN it SHALL work without migration issues
4. WHEN I authenticate after reset THEN it SHALL create the necessary records simply

### Requirement 5: Single User Optimization

**User Story:** As the sole user, I want the app optimized for single-user use without unnecessary multi-tenant complexity.

#### Acceptance Criteria

1. WHEN the app runs THEN it SHALL assume single-user context
2. WHEN data is stored THEN it SHALL not require complex user isolation
3. WHEN queries run THEN they SHALL be optimized for single-user access patterns
4. WHEN errors occur THEN they SHALL be relevant to single-user scenarios