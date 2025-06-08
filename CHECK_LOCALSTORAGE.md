# 🔍 Check Your Data in localStorage

## Open Browser Console and Run:

```javascript
// Check if data exists in localStorage
console.log('=== RUNSIGHT DATA CHECK ===');

const activities = localStorage.getItem('runsight_activities');
const weather = localStorage.getItem('runsight_weather');
const summary = localStorage.getItem('runsight_sync_summary');

console.log('Activities found:', activities ? JSON.parse(activities).length : 'None');
console.log('Weather records found:', weather ? JSON.parse(weather).length : 'None');

if (activities) {
  const activitiesData = JSON.parse(activities);
  console.log('Sample activity:', activitiesData[0]);
}

if (weather) {
  const weatherData = JSON.parse(weather);
  console.log('Sample weather:', weatherData[0]);
}

if (summary) {
  console.log('Sync summary:', JSON.parse(summary));
}
```

## Expected Output:
```
=== RUNSIGHT DATA CHECK ===
Activities found: 6
Weather records found: 6
Sample activity: {name: "Morning Run", distance: 5000, ...}
Sample weather: {temperature: 25.5, humidity: 60, ...}
```

This will confirm your data was imported successfully but stored locally instead of database.