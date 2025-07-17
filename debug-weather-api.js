// Debug script to test OpenWeather API
// Run this to test if your API key and weather enrichment is working

const testWeatherAPI = async () => {
  const openWeatherApiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!openWeatherApiKey) {
    console.error('❌ OPENWEATHER_API_KEY environment variable not set');
    return;
  }
  
  console.log('✅ OpenWeather API key found');
  
  // Test coordinates from your Chennai runs
  const lat = 12.9761;
  const lon = 80.207;
  const timestamp = Math.floor(new Date('2025-07-16T18:35:41Z').getTime() / 1000);
  
  console.log(`Testing weather API for Chennai (${lat}, ${lon}) at ${new Date(timestamp * 1000).toISOString()}`);
  
  try {
    // Test the 3.0 timemachine endpoint (requires paid plan)
    const weatherUrl = `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${timestamp}&appid=${openWeatherApiKey}&units=metric`;
    
    console.log('Making request to:', weatherUrl.replace(openWeatherApiKey, 'API_KEY_HIDDEN'));
    
    const response = await fetch(weatherUrl);
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Weather API failed:', response.status, errorText);
      
      if (response.status === 401) {
        console.error('🔑 API key issue - check if key is valid and has proper permissions');
      } else if (response.status === 402) {
        console.error('💳 Payment required - the 3.0 timemachine endpoint requires a paid OpenWeather plan');
        console.log('💡 Consider using the free 2.5 current weather endpoint for recent data');
      }
      return;
    }
    
    const weatherData = await response.json();
    console.log('✅ Weather API response:', JSON.stringify(weatherData, null, 2));
    
    if (weatherData.data && weatherData.data.length > 0) {
      const weather = weatherData.data[0];
      console.log('🌤️ Extracted weather:', {
        temperature: weather.temp,
        feels_like: weather.feels_like,
        humidity: weather.humidity,
        weather_condition: weather.weather[0]?.main
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing weather API:', error.message);
  }
};

// Run the test
testWeatherAPI();