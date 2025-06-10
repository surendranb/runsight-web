# 🔧 RunSight Troubleshooting Guide

## 🚨 **Current Error: "Failed to get authorization URL"**

This error means the Netlify Function `auth-strava` isn't working. Here's how to fix it:

## 🔍 **Diagnosis Steps**

### 1. **Check if Functions are Deployed**
The functions need to be deployed to Netlify first. Since we just created them, they might not be live yet.

### 2. **Verify Environment Variables**
The server-side environment variables need to be set in Netlify dashboard.

### 3. **Test Function Endpoints**
We can test if the functions are accessible.

## 🛠️ **Quick Fixes**

### **Option 1: Deploy to Netlify (Recommended)**

1. **Push to GitHub** (already done ✅)
2. **Trigger Netlify Deploy**:
   - Go to your Netlify dashboard
   - Find your site
   - Click "Trigger deploy" → "Deploy site"

3. **Set Environment Variables** in Netlify:
   ```
   STRAVA_CLIENT_ID=your_strava_client_id
   STRAVA_CLIENT_SECRET=your_strava_client_secret
   STRAVA_REDIRECT_URI=https://your-app.netlify.app/auth/callback
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your_service_role_key
   OPENWEATHER_API_KEY=your_openweather_key
   ```

4. **Redeploy** after setting environment variables

### **Option 2: Test Locally with Netlify CLI**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Create local environment file for functions
echo "STRAVA_CLIENT_ID=your_client_id" > .env
echo "STRAVA_CLIENT_SECRET=your_client_secret" >> .env
echo "STRAVA_REDIRECT_URI=http://localhost:8888/auth/callback" >> .env
echo "SUPABASE_URL=your_supabase_url" >> .env
echo "SUPABASE_SERVICE_KEY=your_service_key" >> .env
echo "OPENWEATHER_API_KEY=your_weather_key" >> .env

# Start local development server
netlify dev
```

### **Option 3: Quick Test with Mock Data**

If you want to test the UI without setting up all the credentials first, we can create a test mode.

## 🔍 **Debugging Steps**

### 1. **Check Function Logs**
- Go to Netlify dashboard → Functions
- Click on `auth-strava` function
- Check the logs for errors

### 2. **Test Function Directly**
```bash
# Test the auth function endpoint
curl https://your-app.netlify.app/.netlify/functions/auth-strava

# Should return JSON with authUrl
```

### 3. **Verify Function Deployment**
- Check if functions appear in Netlify dashboard
- Verify they're not showing deployment errors

## 🚀 **Immediate Action Plan**

### **Step 1: Check Netlify Deployment**
1. Go to your Netlify dashboard
2. Check if the latest commit is deployed
3. Look for any build errors

### **Step 2: Set Environment Variables**
1. Go to Site Settings → Environment Variables
2. Add all the required server-side variables
3. Redeploy the site

### **Step 3: Test the Function**
1. Visit: `https://your-app.netlify.app/.netlify/functions/auth-strava`
2. Should return JSON with Strava authorization URL

## 🔧 **Common Issues & Solutions**

### **Issue: Functions not found (404)**
- **Cause**: Functions not deployed or wrong path
- **Fix**: Check netlify.toml configuration, redeploy

### **Issue: Environment variables missing**
- **Cause**: Server-side env vars not set in Netlify
- **Fix**: Add them in Netlify dashboard → Environment Variables

### **Issue: CORS errors**
- **Cause**: Missing CORS headers in functions
- **Fix**: Already included in our function code

### **Issue: Strava app not configured**
- **Cause**: Strava app callback URL doesn't match
- **Fix**: Update Strava app settings to match your Netlify URL

## 📋 **Checklist for Working App**

- [ ] Code pushed to GitHub
- [ ] Netlify site deployed successfully
- [ ] Environment variables set in Netlify dashboard
- [ ] Functions visible in Netlify dashboard
- [ ] Strava app callback URL matches Netlify URL
- [ ] Supabase database schema applied
- [ ] Function endpoints return valid responses

## 🆘 **If Still Not Working**

1. **Check Netlify build logs** for any errors
2. **Verify all environment variables** are set correctly
3. **Test functions individually** using curl or browser
4. **Check Strava app configuration** matches your setup

The most likely issue is that the functions need to be deployed to Netlify and the environment variables need to be configured in the Netlify dashboard.