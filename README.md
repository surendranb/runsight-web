# Strava Running Analytics

A beautiful, open-source running analytics app that connects with Strava and OpenWeatherMap to provide comprehensive insights about your runs.

## Features

- 🏃‍♂️ **Strava Integration**: Secure OAuth authentication and automatic run data sync
- 🌤️ **Weather Data**: Historical weather conditions for each run via OpenWeatherMap
- 📊 **Analytics Dashboard**: Beautiful charts and statistics about your running performance
- 🔒 **Secure**: Only authenticated users can access their own data
- 📱 **Responsive**: Optimized for desktop, tablet, and mobile devices
- 🚀 **Easy Deployment**: One-click deployment to Netlify + Supabase

## Quick Setup

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd strava-running-analytics
npm install
```

### 2. Set up Supabase
1. Create a new project at [supabase.com](https://supabase.com)
2. Click the "Connect to Supabase" button in the app (top right)
3. The database schema will be created automatically

### 3. Configure Environment Variables
1. Copy `.env.example` to `.env`
2. Fill in your API keys:
   - **Supabase**: Get from your Supabase project settings
   - **Strava**: Register your app at [developers.strava.com](https://developers.strava.com)
   - **OpenWeatherMap**: Get a free key at [openweathermap.org](https://openweathermap.org/api)

### 4. Development
```bash
npm run dev
```

### 5. Deploy to Netlify
1. Connect your GitHub repo to Netlify
2. Set the environment variables in Netlify's dashboard
3. Deploy!

## API Setup

### Strava API
1. Go to [developers.strava.com](https://developers.strava.com)
2. Create a new app
3. Set Authorization Callback Domain to your domain (e.g., `yourdomain.netlify.app`)
4. Copy Client ID and Client Secret to your `.env`

### OpenWeatherMap API
1. Sign up at [openweathermap.org](https://openweathermap.org/api)
2. Subscribe to the free tier
3. Copy your API key to your `.env`

## Contributing

This is an open-source project! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Fork for your own use

## License

MIT License - feel free to use this for your own running analytics!