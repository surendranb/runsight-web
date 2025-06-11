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
    const OPENWEATHER_API_KEY = process.env.VITE_OPENWEATHER_API_KEY;

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

          const currentActivityWeatherData = {
            temperature: weatherData.data[0]?.temp,
            feels_like: weatherData.data[0]?.feels_like,
            humidity: weatherData.data[0]?.humidity,
            pressure: weatherData.data[0]?.pressure,
            wind_speed: weatherData.data[0]?.wind_speed,
            wind_deg: weatherData.data[0]?.wind_deg,
            weather: weatherData.data[0]?.weather[0],
            visibility: weatherData.data[0]?.visibility,
            uvi: weatherData.data[0]?.uvi
          };

          // Geocoding logic starts here
          let city = null;
          let state = null;
          let country = null;

          if (activity.start_latlng && activity.start_latlng.length === 2) {
            const geoLat = activity.start_latlng[0];
            const geoLng = activity.start_latlng[1];
            // Ensure OPENWEATHER_API_KEY is accessible here, it's defined at the function's top scope
            const geocodingUrl = `http://api.openweathermap.org/geo/1.0/reverse?lat=${geoLat}&lon=${geoLng}&limit=1&appid=${OPENWEATHER_API_KEY}`;

            try {
              const geoResponse = await fetch(geocodingUrl);
              if (geoResponse.ok) {
                const geoData = await geoResponse.json();
                if (geoData && geoData.length > 0) {
                  const location = geoData[0];
                  city = location.name || null;
                  state = location.state || null;
                  country = location.country || null; // This is usually the country code
                  console.log(`🌍 Geocoded activity ${activity.id}: ${city}, ${state}, ${country}`);
                } else {
                  console.log(`⚠️ Geocoding API returned no data for activity ${activity.id}`);
                }
              } else {
                const errorBody = await geoResponse.text();
                console.log(`⚠️ Geocoding API failed for activity ${activity.id}: ${geoResponse.status} - ${errorBody}`);
              }
            } catch (geoError) {
              console.error(`❌ Geocoding fetch error for activity ${activity.id}:`, geoError.message);
            }
          }

          return {
            ...activity,
            weather_data: currentActivityWeatherData,
            city,
            state,
            country
          };

        } catch (error) {
          console.error(`❌ Failed to enrich activity ${activity.id} (weather or geo):`, error.message);
          // Return activity with null for weather and geo if any error occurs during enrichment
          return {
            ...activity,
            weather_data: null,
            city: null,
            state: null,
            country: null
          };
        }
      })
    );

    const enrichedCount = enrichedActivities.filter(a => a.weather_data !== null || a.city !== null).length;
    console.log(`✅ Successfully enriched (weather or geo) ${enrichedCount}/${activities.length} activities`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        activities: enrichedActivities,
        enriched_count: enrichedCount, // Changed from successCount to enrichedCount
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