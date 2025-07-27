# Deployment Guide

## Architecture Overview
RunSight Web uses a serverless architecture with zero frontend credential exposure:
- **Frontend**: Static React app deployed to Netlify
- **Backend**: Netlify Functions for API endpoints
- **Database**: Supabase PostgreSQL with Row Level Security
- **APIs**: Server-side integration with Strava and OpenWeatherMap

## Environment Variables

### Netlify Environment Variables (Server-side)
These must be set in the Netlify dashboard under Site Settings > Environment Variables:

```bash
# Strava API Configuration
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_REDIRECT_URI=https://yourdomain.netlify.app/auth/callback

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# OpenWeatherMap API
OPENWEATHER_API_KEY=your_openweather_api_key

# Optional: AI Coach Integration
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

### Frontend Environment Variables
The frontend requires NO environment variables for security. All API communication goes through Netlify Functions.

## Deployment Steps

### 1. Supabase Setup
1. Create a new Supabase project
2. Run migrations from `supabase/migrations/` in order
3. Enable Row Level Security on all tables
4. Copy the project URL and service role key

### 2. API Setup

#### Strava API
1. Go to [developers.strava.com](https://developers.strava.com)
2. Create a new application
3. Set Authorization Callback Domain to your Netlify domain
4. Copy Client ID and Client Secret

#### OpenWeatherMap API
1. Sign up at [openweathermap.org](https://openweathermap.org/api)
2. Subscribe to a paid plan (required for historical weather data)
3. Copy your API key

### 3. Netlify Deployment
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add all environment variables in Site Settings
5. Deploy

### 4. Domain Configuration
1. Set up custom domain in Netlify (optional)
2. Update STRAVA_REDIRECT_URI to match your domain
3. Update Strava app settings with new domain

## Build Configuration

### Netlify Configuration (`netlify.toml`)
```toml
[build]
  command = "npm run build"
  functions = "netlify/functions"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/auth/callback"
  to = "/index.html"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Build Process
1. Environment validation via `scripts/check-env.js`
2. TypeScript compilation and type checking
3. Vite build with React plugin
4. Static asset optimization
5. Netlify Functions bundling

## Security Considerations

### Zero Frontend Exposure
- No API keys or secrets in frontend code
- All sensitive operations in Netlify Functions
- Environment variables prefixed with `VITE_` are avoided

### Database Security
- Row Level Security (RLS) enabled on all tables
- User data isolated by auth.uid()
- Service role key used only in backend functions

### API Security
- OAuth tokens stored securely in database
- Rate limiting implemented for external APIs
- Input validation on all endpoints

## Monitoring and Debugging

### Netlify Functions Logs
- View function logs in Netlify dashboard
- Use console.log for debugging (visible in function logs)
- Monitor function execution time and errors

### Supabase Monitoring
- Monitor database performance in Supabase dashboard
- Check RLS policy effectiveness
- Review query performance and indexing

### Error Handling
- Comprehensive error logging in functions
- User-friendly error messages in frontend
- Debug console available in development (Ctrl+Shift+D)

## Performance Optimization

### Frontend
- Code splitting with React.lazy
- Image optimization and lazy loading
- Efficient re-rendering with React.memo

### Backend
- Database query optimization with proper indexes
- Efficient data fetching with pagination
- Caching strategies for frequently accessed data

### API Integration
- Rate limiting compliance
- Batch processing for large datasets
- Progress tracking for long-running operations