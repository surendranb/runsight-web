# 🔒 Secure Deployment Guide

## 🎯 **Overview**

This guide shows how to deploy the secure version of RunSight that eliminates all frontend credential exposure by using Netlify Functions for sensitive operations.

## 🏗️ **Architecture**

### ✅ **Secure (New)**
```
Frontend (Browser) → Netlify Functions → External APIs
                                     → Supabase Database
```

### ❌ **Insecure (Old)**
```
Frontend (Browser) → External APIs (credentials exposed)
                  → Supabase Database (credentials exposed)
```

## 🔧 **Deployment Steps**

### 1. **Set Up Netlify Environment Variables**

In your Netlify dashboard, go to Site Settings → Environment Variables and add:

#### **Server-Side Only (Secure)**
```bash
# Strava API (server-side)
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret  # SECURE - never exposed
STRAVA_REDIRECT_URI=https://your-app.netlify.app/auth/callback

# Supabase (server-side)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key  # SECURE - never exposed

# OpenWeatherMap (server-side)
OPENWEATHER_API_KEY=your_openweather_key  # SECURE - never exposed
```

#### **Important Notes:**
- ❌ **NO** `VITE_` prefixed variables (these get exposed to browser)
- ✅ **Use service role key** for Supabase (not anon key)
- ✅ **All credentials stay on server**

### 2. **Update Supabase Database**

Apply the simple schema migration:

```sql
-- Run in Supabase SQL Editor:
-- Copy content from: supabase/migrations/20250609100000_fresh_start_simple_schema.sql
```

### 3. **Deploy to Netlify**

```bash
# Push to GitHub
git add .
git commit -m "Secure architecture with Netlify Functions"
git push origin main

# Netlify will auto-deploy with the new functions
```

### 4. **Update Strava App Settings**

In your Strava app settings:
- **Authorization Callback Domain**: `your-app.netlify.app`
- **Redirect URI**: `https://your-app.netlify.app/auth/callback`

## 🧪 **Testing the Secure Setup**

### 1. **Verify No Credential Exposure**
```bash
# Check built files for credentials (should find NONE):
curl -s https://your-app.netlify.app | grep -i "supabase\|strava\|openweather"
# Should return nothing!
```

### 2. **Test Authentication Flow**
1. Visit your app
2. Click "Connect with Strava"
3. Authorize on Strava
4. Should redirect back and sync data

### 3. **Test Functions**
```bash
# Test auth endpoint:
curl https://your-app.netlify.app/.netlify/functions/auth-strava

# Should return auth URL without exposing credentials
```

## 🔍 **Security Verification**

### ✅ **What Should Work**
- User authentication through Netlify Functions
- Data syncing without exposed credentials
- Dashboard showing runs and weather data
- No sensitive data in browser JavaScript

### ❌ **What Should Fail**
- Direct API calls from browser to Strava/OpenWeather
- Finding credentials in browser dev tools
- Accessing other users' data

## 🚨 **Migration from Old Architecture**

If you're migrating from the credential-exposed version:

### 1. **Remove Frontend Environment Variables**
Delete these from Netlify (they're no longer needed):
```bash
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_STRAVA_CLIENT_ID
VITE_STRAVA_CLIENT_SECRET
VITE_OPENWEATHER_API_KEY
```

### 2. **Add Server-Side Environment Variables**
Add the secure versions (without VITE_ prefix) as shown above.

### 3. **Update Main App Component**
Replace the main App.tsx import:

```typescript
// Old (insecure):
import App from './App'

// New (secure):
import SecureApp from './SecureApp'

// In main.tsx:
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SecureApp />
  </React.StrictMode>,
)
```

## 📊 **Benefits of Secure Architecture**

### 🔒 **Security**
- ✅ Zero credential exposure in frontend
- ✅ Server-side token management
- ✅ Secure OAuth flow
- ✅ Protected database access

### 🎯 **Performance**
- ✅ Smaller frontend bundle (no API libraries)
- ✅ Server-side caching opportunities
- ✅ Optimized API calls
- ✅ Better error handling

### 🛠️ **Maintainability**
- ✅ Clear separation of concerns
- ✅ Easier testing
- ✅ Better monitoring
- ✅ Simpler debugging

## 🔧 **Troubleshooting**

### **Functions Not Working**
1. Check Netlify function logs
2. Verify environment variables are set
3. Ensure `netlify.toml` is configured correctly

### **Authentication Failing**
1. Verify Strava app callback URL
2. Check STRAVA_CLIENT_SECRET is set
3. Ensure redirect URI matches exactly

### **Database Errors**
1. Verify SUPABASE_SERVICE_KEY (not anon key)
2. Check database schema is applied
3. Ensure user permissions are correct

## 🎯 **Next Steps**

Once deployed:
1. Test the complete user flow
2. Monitor function performance
3. Set up error tracking
4. Consider adding rate limiting
5. Implement caching strategies

This secure architecture ensures your users' data is protected while providing a seamless experience!