# 🔧 Debug: HTTP 500 Error from auth-strava Function

## 🎯 **The Issue**
Your Netlify Function is deployed but returning a **500 Internal Server Error**. This typically means:

1. **Missing environment variables** in Netlify dashboard
2. **Incorrect environment variable values**
3. **Function code error** (less likely since our code is tested)

## 🔍 **Immediate Diagnosis**

### **Step 1: Check Netlify Function Logs**
1. Go to **Netlify Dashboard** → Your Site → **Functions**
2. Click on **`auth-strava`** function
3. Check the **logs** for error details
4. Look for errors like "Missing required environment variables"

### **Step 2: Verify Environment Variables**
Go to **Site Settings** → **Environment Variables** and ensure you have:

```
STRAVA_CLIENT_ID=your_actual_client_id
STRAVA_CLIENT_SECRET=your_actual_client_secret
STRAVA_REDIRECT_URI=https://resonant-pony-ea7953.netlify.app/auth/callback
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_actual_service_key
```

## 🚨 **Most Likely Causes**

### **1. Missing STRAVA_CLIENT_SECRET**
The function checks for this variable and throws an error if missing:
```javascript
if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required environment variables');
}
```

### **2. Wrong Variable Names**
Make sure the variable names are **exactly**:
- `STRAVA_CLIENT_ID` (not `VITE_STRAVA_CLIENT_ID`)
- `STRAVA_CLIENT_SECRET` (not `VITE_STRAVA_CLIENT_SECRET`)
- etc.

### **3. Need to Redeploy After Setting Variables**
After adding environment variables, you **must redeploy** the site for functions to access them.

## ⚡ **Quick Fix Steps**

### **Step 1: Set Environment Variables**
In Netlify dashboard, add these **exact** variable names:

```bash
STRAVA_CLIENT_ID=12345  # Your actual Strava client ID
STRAVA_CLIENT_SECRET=abcdef123456  # Your actual Strava client secret
STRAVA_REDIRECT_URI=https://resonant-pony-ea7953.netlify.app/auth/callback
SUPABASE_URL=https://your-project.supabase.co  # Your actual Supabase URL
SUPABASE_SERVICE_KEY=your-service-key  # Your actual service role key
OPENWEATHER_API_KEY=your-weather-key  # Your actual weather API key
```

### **Step 2: Trigger Redeploy**
1. After setting variables, click **"Trigger deploy"** → **"Deploy site"**
2. Wait for deployment to complete

### **Step 3: Test Again**
1. Visit your app: https://resonant-pony-ea7953.netlify.app
2. Click "Connect with Strava"
3. Should now work!

## 🧪 **Test Function Directly**

You can test the function directly to see the exact error:

```bash
curl -v https://resonant-pony-ea7953.netlify.app/.netlify/functions/auth-strava
```

Or visit this URL in your browser:
https://resonant-pony-ea7953.netlify.app/.netlify/functions/auth-strava

## 🔍 **How to Get Your Credentials**

### **Strava App Credentials**
1. Go to: https://www.strava.com/settings/api
2. If you don't have an app, click **"Create App"**
3. Fill in:
   - **Application Name**: RunSight
   - **Category**: Data Importer
   - **Website**: https://resonant-pony-ea7953.netlify.app
   - **Authorization Callback Domain**: resonant-pony-ea7953.netlify.app
4. Get your **Client ID** and **Client Secret**

### **Supabase Credentials**
1. Go to your Supabase project dashboard
2. **Settings** → **API**
3. Copy:
   - **URL**: `https://your-project.supabase.co`
   - **service_role key** (NOT the anon key!)

### **OpenWeatherMap API Key**
1. Sign up at: https://openweathermap.org/api
2. Get your free API key

## 🔧 **Debugging Tips**

### **Check Function Logs**
The most important step is checking the Netlify function logs to see the exact error message.

### **Common Error Messages**
- `"Missing required environment variables"` → Set the env vars
- `"Failed to exchange code for token"` → Check Strava app config
- `"Failed to create user"` → Check Supabase service key

### **Test Environment Variables**
You can temporarily add a simple test function to verify env vars are accessible.

## 🎯 **Expected Success Response**

When working correctly, the function should return:
```json
{
  "authUrl": "https://www.strava.com/oauth/authorize?client_id=12345&response_type=code&redirect_uri=..."
}
```

## 🆘 **If Still Not Working**

1. **Share the function logs** from Netlify dashboard
2. **Verify all environment variables** are set with correct names
3. **Confirm Strava app callback URL** matches your Netlify URL
4. **Try the test page**: https://resonant-pony-ea7953.netlify.app/test-functions.html

The 500 error is almost certainly a missing environment variable issue - once those are set correctly, it should work immediately!