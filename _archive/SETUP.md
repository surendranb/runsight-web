# RunSight Web - Setup Guide

## Overview

RunSight is a comprehensive running analytics application that integrates with Strava to provide detailed insights about your running performance, including weather data for each run.

## Application Flow

1. **Login via Strava OAuth2** - Secure authentication with Strava
2. **Import Running Data** - Fetches all your running activities from Strava
3. **Fetch Weather Data** - Gets historical weather data for each run using OpenWeatherMap API
4. **Store in Supabase** - Saves all data securely in PostgreSQL database
5. **Analytics Dashboard** - Provides beautiful visualizations and insights

## Environment Variables Required

You need to set up the following environment variables:

### For Local Development
Create a `.env` file in the root directory with:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Strava API Configuration
VITE_STRAVA_CLIENT_ID=your_strava_client_id
VITE_STRAVA_CLIENT_SECRET=your_strava_client_secret
VITE_STRAVA_REDIRECT_URI=http://localhost:12000/callback

# OpenWeatherMap API
VITE_OPENWEATHER_API_KEY=your_openweather_api_key
```

### For Production (Netlify)
Set the same variables in your Netlify environment settings, but update the redirect URI:
```
VITE_STRAVA_REDIRECT_URI=https://your-domain.netlify.app/callback
```

## API Setup Required

### 1. Strava API
1. Go to https://www.strava.com/settings/api
2. Create a new application
3. Set Authorization Callback Domain to your domain
4. Get your Client ID and Client Secret

### 2. Supabase
1. Create a new project at https://supabase.com
2. Run the migration in `supabase/migrations/` to set up the database schema
3. Get your project URL and anon key from Settings > API

### 3. OpenWeatherMap
1. Sign up at https://openweathermap.org/api
2. Subscribe to the "One Call API 3.0" (required for historical weather data)
3. Get your API key

## Database Schema

The application uses three main tables:

- **users** - Strava user data and authentication tokens
- **activities** - Running activities imported from Strava
- **weather** - Weather data for each activity

All tables have Row Level Security (RLS) enabled for data protection.

## Features

### Current Features
- ✅ Strava OAuth2 authentication
- ✅ Complete running activity import
- ✅ Historical weather data fetching
- ✅ Comprehensive analytics dashboard
- ✅ Beautiful data visualizations
- ✅ Responsive design

### Analytics Provided
- Total runs, distance, time
- Average pace and heart rate
- Elevation gain statistics
- Best performance metrics
- Activity timeline charts
- Weather correlation data

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Deployment

The application is configured for Netlify deployment with proper CORS and environment variable handling.

## Security

- All sensitive data is encrypted in Supabase
- Row Level Security ensures users only see their own data
- OAuth2 tokens are securely stored and refreshed automatically
- No sensitive data is exposed in the frontend

## Troubleshooting

### "undefined" in Strava OAuth URL
- Check that all environment variables are properly set
- Ensure VITE_ prefix is used for all frontend environment variables

### Weather data not loading
- Verify OpenWeatherMap API key is valid
- Check that you have access to the One Call API 3.0
- Historical weather requires coordinates from Strava activities

### Activities not importing
- Ensure Strava app has "activity:read_all" scope
- Check that the user has running activities in their Strava account
- Verify Supabase connection and permissions