# RunSight Web - Deployment Guide

## 🎯 Quick Netlify Deployment

This application is designed for easy one-click deployment to Netlify. Follow these steps:

### 1. Strava API Setup

1. Go to https://www.strava.com/settings/api
2. Click "Create App" or edit your existing app
3. Set the following:
   - **Application Name**: RunSight Web (or your preferred name)
   - **Category**: Data Importer
   - **Club**: Leave blank
   - **Website**: Your Netlify URL (e.g., `https://your-app-name.netlify.app`)
   - **Authorization Callback Domain**: Your Netlify domain (e.g., `your-app-name.netlify.app`)
   
   ⚠️ **Important**: The Authorization Callback Domain must match your Netlify domain exactly!

4. Save and note your:
   - Client ID
   - Client Secret

### 2. Supabase Setup

1. Go to https://supabase.com and create a new project
2. Go to Settings > Database and run the migration from `supabase/migrations/20250607043514_rustic_flame.sql`
3. Go to Settings > API and note:
   - Project URL
   - Anon public key

### 3. OpenWeatherMap Setup

1. Sign up at https://openweathermap.org/api
2. Subscribe to "One Call API 3.0" (required for historical weather data)
3. Get your API key

### 4. Deploy to Netlify

#### Option A: Deploy from GitHub
1. Fork this repository to your GitHub account
2. Connect your GitHub account to Netlify
3. Create a new site from your forked repository
4. Set the build command: `npm run build`
5. Set the publish directory: `dist`

#### Option B: Manual Deploy
1. Run `npm run build` locally
2. Drag and drop the `dist` folder to Netlify

### 5. Configure Environment Variables in Netlify

Go to your Netlify site dashboard > Site settings > Environment variables and add:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRAVA_CLIENT_ID=your_strava_client_id
VITE_STRAVA_CLIENT_SECRET=your_strava_client_secret
VITE_STRAVA_REDIRECT_URI=https://your-app-name.netlify.app/callback
VITE_OPENWEATHER_API_KEY=your_openweather_api_key
```

⚠️ **Important**: Replace `your-app-name.netlify.app` with your actual Netlify domain!

### 6. Update Strava Redirect URI

After deployment, update your Strava application settings:
- **Authorization Callback Domain**: `your-app-name.netlify.app`
- **Website**: `https://your-app-name.netlify.app`

### 7. Test the Application

1. Visit your Netlify URL
2. Click "Connect with Strava"
3. Authorize the application
4. Wait for data import to complete
5. Enjoy your running analytics!

## 🔧 Local Development

For local development:

1. Clone the repository
2. Copy `.env.example` to `.env`
3. Fill in your environment variables
4. Run `npm install`
5. Run `npm run dev`

## 🚀 Features

- ✅ Strava OAuth2 authentication
- ✅ Complete running activity import
- ✅ Historical weather data for each run
- ✅ Comprehensive analytics dashboard
- ✅ Beautiful data visualizations
- ✅ Responsive design
- ✅ Secure data storage

## 🔒 Security

- All sensitive data is encrypted in Supabase
- Row Level Security ensures users only see their own data
- OAuth2 tokens are securely stored and refreshed automatically
- No sensitive data is exposed in the frontend

## 📊 Analytics Provided

- Total runs, distance, time
- Average pace and heart rate
- Elevation gain statistics
- Best performance metrics
- Activity timeline charts
- Weather correlation data

## 🐛 Troubleshooting

### "Invalid redirect_uri" error
- Check that your Strava app's Authorization Callback Domain matches your Netlify domain exactly
- Ensure the redirect URI in environment variables matches your deployment URL

### Weather data not loading
- Verify OpenWeatherMap API key is valid
- Check that you have access to the One Call API 3.0
- Historical weather requires coordinates from Strava activities

### Activities not importing
- Ensure Strava app has "activity:read_all" scope
- Check that the user has running activities in their Strava account
- Verify Supabase connection and permissions

## 📝 License

Open source - feel free to fork and customize for your needs!