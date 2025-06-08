# Netlify Deployment Troubleshooting

## Issue: Environment Variables Showing as "undefined"

If you're seeing `undefined` in the Strava OAuth URL, it means the environment variables aren't being loaded properly during the Netlify build.

## ✅ Step-by-Step Fix

### 1. Verify Environment Variables in Netlify

Go to your Netlify site dashboard → Site settings → Environment variables

Make sure you have ALL these variables set:

```
VITE_SUPABASE_URL=https://cszerlixrmqpalkpckqb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzemVybGl4cm1xcGFsa3Bja3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNzA3OTksImV4cCI6MjA2NDg0Njc5OX0.SXUyfSdDmV7ZSp_B6TRp8qr8RHUs6qgkgkFn5ZHqMOU
VITE_STRAVA_CLIENT_ID=142112
VITE_STRAVA_CLIENT_SECRET=5401750e26963cad118cf2b890869bca6566710d
VITE_STRAVA_REDIRECT_URI=https://resonant-pony-ea7953.netlify.app/callback
VITE_OPENWEATHER_API_KEY=92b8a21cde280b0d368d7736d196ea58
```

⚠️ **Important**: Make sure there are NO extra spaces or hidden characters!

### 2. Check Variable Scope

In Netlify environment variables:
- Set scope to "All scopes" 
- Set context to "Same value in all deploy contexts"

### 3. Trigger a New Deploy

After setting environment variables:
1. Go to Deploys tab
2. Click "Trigger deploy" → "Deploy site"
3. Wait for the build to complete

### 4. Verify Variables Are Loading

After deployment, visit your site. You should see a small debug panel in the bottom-right corner showing the status of all environment variables.

### 5. Common Issues & Solutions

#### Issue: Variables still showing as undefined
**Solution**: 
1. Double-check variable names (they must start with `VITE_`)
2. Ensure no trailing spaces in values
3. Try clearing Netlify's build cache: Deploys → Deploy settings → Clear cache and deploy site

#### Issue: Build fails
**Solution**:
1. Check the build logs in Netlify
2. Ensure `netlify.toml` is in the root directory
3. Verify Node.js version compatibility

#### Issue: Strava redirect error
**Solution**:
1. Go to https://www.strava.com/settings/api
2. Set Authorization Callback Domain to: `resonant-pony-ea7953.netlify.app`
3. Ensure no `https://` prefix in the domain field

### 6. Manual Verification Steps

1. **Check Build Logs**: Look for any environment variable warnings
2. **Test the URL**: The Strava auth URL should look like:
   ```
   https://www.strava.com/oauth/authorize?client_id=142112&response_type=code&redirect_uri=https%3A%2F%2Fresonant-pony-ea7953.netlify.app%2Fcallback&approval_prompt=force&scope=read,activity:read_all
   ```
3. **Debug Panel**: Check the bottom-right corner for environment variable status

### 7. Alternative: Manual Environment File

If environment variables still don't work, you can temporarily create a production build with hardcoded values:

1. Create a `.env.production` file:
```env
VITE_SUPABASE_URL=https://cszerlixrmqpalkpckqb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzemVybGl4cm1xcGFsa3Bja3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNzA3OTksImV4cCI6MjA2NDg0Njc5OX0.SXUyfSdDmV7ZSp_B6TRp8qr8RHUs6qgkgkFn5ZHqMOU
VITE_STRAVA_CLIENT_ID=142112
VITE_STRAVA_CLIENT_SECRET=5401750e26963cad118cf2b890869bca6566710d
VITE_STRAVA_REDIRECT_URI=https://resonant-pony-ea7953.netlify.app/callback
VITE_OPENWEATHER_API_KEY=92b8a21cde280b0d368d7736d196ea58
```

2. Commit and push to trigger a new deploy

⚠️ **Security Note**: Remove this file after confirming the deployment works!

### 8. Contact Support

If none of these solutions work:
1. Check Netlify's build logs for specific errors
2. Try deploying a simple test with just one environment variable
3. Contact Netlify support with your build logs

## Expected Result

After fixing the environment variables, you should see:
1. ✅ Debug panel shows all variables as "Set"
2. ✅ Strava login button redirects to proper Strava OAuth page
3. ✅ Successful authentication and data import
4. ✅ Beautiful analytics dashboard with your running data

The application is fully functional - it's just a matter of getting the environment variables loaded correctly in Netlify!