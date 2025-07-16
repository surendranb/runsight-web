# Simple Sync Fix Design

## Problem Analysis
The current sync fails because the Netlify function returns invalid JSON or crashes.

## Solution
Create a minimal, working sync function that:
1. Returns valid JSON always
2. Handles basic Strava API calls
3. Stores data in Supabase
4. Provides clear error messages

## Architecture
```
Frontend -> Netlify Function -> Strava API -> Supabase
```

## Implementation Plan
1. Fix the Netlify function to return valid JSON
2. Add basic Strava API integration
3. Add basic Supabase storage
4. Test end-to-end