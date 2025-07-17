// Test what Strava API actually returns
async function testStravaAPI() {
  // Get user tokens first
  const response = await fetch('https://resonant-pony-ea7953.netlify.app/.netlify/functions/sync-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 20683290,
      timeRange: { after: 1750118400, before: 1752722313 },
      debug: true // Add debug flag
    })
  });

  const result = await response.json();
  console.log('Sync result:', JSON.stringify(result, null, 2));
}

testStravaAPI().catch(console.error);