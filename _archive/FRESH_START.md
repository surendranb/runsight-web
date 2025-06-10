# 🚀 Fresh Start - Simple & Robust Implementation

## 🎯 **The Problem**
Current implementation is too complex and failing at basic CRUD operations. We need to start fresh with the simplest possible approach.

## 📋 **New Simple Architecture**

### 1. **Authentication: Use Supabase Auth Directly**
- No custom user tables
- Use Supabase's built-in `auth.users` table
- Store Strava tokens in user metadata
- Simple, reliable, no RLS issues

### 2. **Database: Single Table Approach**
- One simple `runs` table with all data
- No complex relationships initially
- No RLS policies to start with
- Clear error messages

### 3. **Flow: Step by Step Verification**
- Test each step independently
- Clear logging at each stage
- Fail fast with clear error messages
- No silent failures

## 🔧 **Implementation Plan**

### Step 1: Clean Database Schema
```sql
-- Drop existing complex tables
DROP TABLE IF EXISTS public.run_splits;
DROP TABLE IF EXISTS public.enriched_runs;

-- Create simple runs table
CREATE TABLE public.runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  strava_id bigint UNIQUE NOT NULL,
  name text NOT NULL,
  distance real NOT NULL,
  moving_time integer NOT NULL,
  start_date timestamptz NOT NULL,
  start_latlng point,
  weather_data jsonb,
  strava_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- No RLS initially - get it working first
-- Simple permissions
GRANT ALL ON public.runs TO authenticated;
```

### Step 2: Simple Authentication
```typescript
// Use Supabase auth directly
const signInWithStrava = async (stravaData) => {
  const { data, error } = await supabase.auth.signUp({
    email: `${stravaData.athlete.id}@strava.local`,
    password: `strava_${stravaData.athlete.id}`,
    options: {
      data: {
        strava_id: stravaData.athlete.id,
        strava_tokens: {
          access_token: stravaData.access_token,
          refresh_token: stravaData.refresh_token,
          expires_at: stravaData.expires_at
        }
      }
    }
  });
  
  if (error && error.message !== 'User already registered') {
    throw error;
  }
  
  return data.user;
};
```

### Step 3: Simple Data Storage
```typescript
const saveRun = async (runData) => {
  const { data, error } = await supabase
    .from('runs')
    .insert({
      user_id: user.id,
      strava_id: runData.id,
      name: runData.name,
      distance: runData.distance,
      moving_time: runData.moving_time,
      start_date: runData.start_date,
      start_latlng: runData.start_latlng ? `(${runData.start_latlng[1]},${runData.start_latlng[0]})` : null,
      weather_data: weatherData,
      strava_data: runData
    })
    .select()
    .single();
    
  if (error) {
    console.error('Failed to save run:', error);
    throw error;
  }
  
  return data;
};
```

This approach:
- ✅ Uses proven Supabase patterns
- ✅ Has clear error handling
- ✅ Is simple to debug
- ✅ Can be extended later
- ✅ No complex RLS to debug