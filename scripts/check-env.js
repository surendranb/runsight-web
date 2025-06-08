#!/usr/bin/env node

console.log('🔍 Checking environment variables...\n');

const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_STRAVA_CLIENT_ID',
  'VITE_STRAVA_CLIENT_SECRET',
  'VITE_STRAVA_REDIRECT_URI',
  'VITE_OPENWEATHER_API_KEY'
];

let allPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const displayValue = value ? 
    (varName.includes('SECRET') || varName.includes('KEY') ? 
      `${value.substring(0, 10)}...` : value) : 
    'MISSING';
  
  console.log(`${status} ${varName}: ${displayValue}`);
  
  if (!value) {
    allPresent = false;
  }
});

console.log('\n📊 Summary:');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`All variables present: ${allPresent ? '✅ Yes' : '❌ No'}`);

if (!allPresent) {
  console.log('\n⚠️  Missing environment variables detected!');
  console.log('Please check your Netlify environment variable settings.');
  process.exit(1);
}

console.log('\n🎉 All environment variables are properly set!');