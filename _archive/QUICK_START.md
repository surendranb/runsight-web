# 🚀 Quick Start: Fix "Failed to get authorization URL"

## 🎯 **The Issue**
The error "Failed to get authorization URL" means the Netlify Functions aren't deployed/configured yet.

## ⚡ **Immediate Fix (5 minutes)**

### **Step 1: Deploy to Netlify**
1. Go to your **Netlify dashboard**
2. Find your RunSight site
3. Click **"Trigger deploy"** → **"Deploy site"**
4. Wait for deployment to complete

### **Step 2: Set Environment Variables**
1. In Netlify dashboard, go to **Site Settings** → **Environment Variables**
2. Add these variables (replace with your actual values):

```
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret  
STRAVA_REDIRECT_URI=https://your-app.netlify.app/auth/callback
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
OPENWEATHER_API_KEY=your_openweather_key
```

### **Step 3: Redeploy**
1. After adding environment variables, **trigger another deploy**
2. This ensures functions have access to the variables

### **Step 4: Test**
1. Visit your app again
2. Click "Connect with Strava"
3. Should now work! 🎉

## 🔍 **How to Get Your Credentials**

### **Strava App**
1. Go to https://www.strava.com/settings/api
2. Create a new app if you haven't
3. Get `Client ID` and `Client Secret`
4. Set callback URL to: `https://your-app.netlify.app/auth/callback`

### **Supabase**
1. Go to your Supabase project dashboard
2. Settings → API
3. Get `URL` and `service_role` key (not anon key!)

### **OpenWeatherMap**
1. Sign up at https://openweathermap.org/api
2. Get your free API key

## 🧪 **Test Functions**

After deployment, test if functions work:
1. Visit: `https://your-app.netlify.app/test-functions.html`
2. Click "Test auth-strava"
3. Should return a Strava authorization URL

## 🆘 **Still Not Working?**

### **Check Netlify Build Logs**
1. Netlify dashboard → Deploys
2. Click latest deploy
3. Check for any build errors

### **Verify Functions Deployed**
1. Netlify dashboard → Functions
2. Should see 5 functions listed:
   - auth-strava
   - fetch-activities
   - enrich-weather
   - save-runs
   - get-user-runs

### **Test Function Directly**
```bash
curl https://your-app.netlify.app/.netlify/functions/auth-strava
```
Should return JSON with `authUrl`.

## 🎯 **Why This Happened**

The secure architecture we built moves all credentials to **server-side Netlify Functions**. This means:

1. ✅ **No credentials in browser** (secure!)
2. ⚙️ **Functions need to be deployed** first
3. 🔑 **Environment variables must be set** in Netlify dashboard
4. 🔄 **Redeploy needed** after setting variables

This is the **correct and secure approach** - it just requires the initial setup!

## 🎉 **Once Working**

Your app will have:
- ✅ Zero credential exposure
- ✅ Secure multi-user data isolation  
- ✅ Server-side API calls
- ✅ Proper OAuth flow
- ✅ Weather-enriched running data

The architecture is **bulletproof secure** - it just needs the deployment setup completed!