// Netlify Function: Enrich activities with weather data (server-side)
// This keeps OpenWeatherMap API key on the server

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

    if (!OPENWEATHER_API_KEY) {
      throw new Error('OpenWeatherMap API key not configured');
    }

    const { activities } = JSON.parse(event.body);

    if (!activities || !Array.isArray(activities)) {
      throw new Error('Activities array is required');
    }

    // Enrich each activity with weather data
    const enrichedActivities = await Promise.all(
      activities.map(async (activity) => {
        try {
          if (!activity.start_latlng || activity.start_latlng.length !== 2) {
            console.log(`⏭️ Skipping activity ${activity.id} - no location data`);
            return { ...activity, weather_data: null };
          }

          const [lat, lng] = activity.start_latlng;
          const startTime = new Date(activity.start_date).getTime() / 1000;

          // Fetch weather data from OpenWeatherMap (server-side)
          const weatherUrl = `https://api.openweathermap.org/data/3.0/onecall/timemachine?` +
            `lat=${lat}&lon=${lng}&dt=${Math.floor(startTime)}&appid=${OPENWEATHER_API_KEY}&units=metric`;

          const weatherResponse = await fetch(weatherUrl);

          if (!weatherResponse.ok) {
            console.log(`⚠️ Weather API failed for activity ${activity.id}: ${weatherResponse.status}`);
            return { ...activity, weather_data: null };
          }

          const weatherData = await weatherResponse.json();

          console.log(`✅ Enriched activity ${activity.id} with weather data`);

          return {
            ...activity,
            weather_data: {
              temperature: weatherData.data[0]?.temp,
              feels_like: weatherData.data[0]?.feels_like,
              humidity: weatherData.data[0]?.humidity,
              pressure: weatherData.data[0]?.pressure,
              wind_speed: weatherData.data[0]?.wind_speed,
              wind_deg: weatherData.data[0]?.wind_deg,
              weather: weatherData.data[0]?.weather[0],
              visibility: weatherData.data[0]?.visibility,
              uvi: weatherData.data[0]?.uvi
            }
          };

        } catch (error) {
          console.error(`❌ Failed to enrich activity ${activity.id}:`, error.message);
          return { ...activity, weather_data: null };
        }
      })
    );

    const successCount = enrichedActivities.filter(a => a.weather_data !== null).length;
    console.log(`✅ Successfully enriched ${successCount}/${activities.length} activities`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        activities: enrichedActivities,
        enriched_count: successCount,
        total_count: activities.length
      })
    };

  } catch (error) {
    console.error('Weather enrichment error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to enrich with weather data',
        message: error.message 
      })
    };
  }
};