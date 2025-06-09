// Simple test to show environment variable exposure
console.log('🔍 Testing environment variable exposure...');

// These will be hardcoded into the built files:
const demoSecret = import.meta.env.VITE_DEMO_SECRET;
const fakeApiKey = import.meta.env.VITE_FAKE_API_KEY;

console.log('Demo Secret:', demoSecret);
console.log('Fake API Key:', fakeApiKey);

// After build, search for these values in the dist/ folder
// They will be found as literal strings in the JavaScript files