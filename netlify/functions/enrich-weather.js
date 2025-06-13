// netlify/functions/enrich-weather.js
const fetch = require('node-fetch'); // Assuming node-fetch is available or added as a dependency

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*', // Adjust for production
    'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Authorization if you secure this function
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
      body: JSON.stringify({ error: 'Method not allowed. Please use POST.' }),
    };
  }

  const { VITE_OPENWEATHER_API_KEY: OPENWEATHER_API_KEY } = process.env;

  if (!OPENWEATHER_API_KEY) {
    console.error('[enrich-weather] Missing OpenWeatherMap API key (VITE_OPENWEATHER_API_KEY).');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error: OpenWeatherMap API key not configured.' }),
    };
  }

  try {
    const { activities } = JSON.parse(event.body);

    if (!activities || !Array.isArray(activities)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Activities array is required in the request body.' }) };
    }

    if (activities.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          activities: [],
          enriched_count: 0,
          geocoded_count: 0,
          total_count: 0
        })
      };
    }

    console.log(`[enrich-weather] Received ${activities.length} activities to enrich.`);

    const enrichedActivities = await Promise.all(
      activities.map(async (activity) => {
        let weatherData = null;
        let geoData = { city: null, state: null, country: null };

        if (!activity.start_latlng || activity.start_latlng.length !== 2 || !activity.start_date) {
          console.log(`[enrich-weather] Skipping activity ${activity.id || 'N/A'} due to missing location or start_date.`);
          return { ...activity, weather_data: null, city: null, state: null, country: null };
        }

        const [lat, lng] = activity.start_latlng;
        const startTimeEpoch = Math.floor(new Date(activity.start_date).getTime() / 1000);

        try {
          // Fetch historical weather data
          const weatherUrl = `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lng}&dt=${startTimeEpoch}&appid=${OPENWEATHER_API_KEY}&units=metric`;
          const weatherResponse = await fetch(weatherUrl);
          if (weatherResponse.ok) {
            const owmData = await weatherResponse.json();
            if (owmData.data && owmData.data.length > 0) {
              const currentActivityWeather = owmData.data[0];
              weatherData = { // Storing a structured subset
                temperature: currentActivityWeather.temp,
                feels_like: currentActivityWeather.feels_like,
                humidity: currentActivityWeather.humidity,
                pressure: currentActivityWeather.pressure,
                wind_speed: currentActivityWeather.wind_speed,
                wind_deg: currentActivityWeather.wind_deg,
                weather_conditions: currentActivityWeather.weather, // Array of conditions
                uvi: currentActivityWeather.uvi,
                visibility: currentActivityWeather.visibility,
              };
              console.log(`[enrich-weather] Successfully fetched weather for activity ${activity.id}`);
            } else {
              console.warn(`[enrich-weather] Weather API returned no data for activity ${activity.id} at ${lat},${lng} time ${startTimeEpoch}. Response:`, JSON.stringify(owmData).substring(0,200));
            }
          } else {
            const errorBody = await weatherResponse.text();
            console.warn(`[enrich-weather] Weather API request failed for activity ${activity.id}: ${weatherResponse.status} - ${errorBody.substring(0,200)}`);
          }
        } catch (weatherError) {
          console.error(`[enrich-weather] Error fetching weather for activity ${activity.id}:`, weatherError.message);
        }

        try {
          // Fetch reverse geocoding data
          const geocodingUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lng}&limit=1&appid=${OPENWEATHER_API_KEY}`;
          const geoResponse = await fetch(geocodingUrl);
          if (geoResponse.ok) {
            const owmGeoData = await geoResponse.json();
            if (owmGeoData && owmGeoData.length > 0) {
              const location = owmGeoData[0];
              geoData.city = location.name || null;
              geoData.state = location.state || null;
              geoData.country = location.country || null; // This is usually the country code
              console.log(`[enrich-weather] Successfully geocoded activity ${activity.id}: ${geoData.city}, ${geoData.state}, ${geoData.country}`);
            } else {
               console.warn(`[enrich-weather] Geocoding API returned no data for activity ${activity.id} at ${lat},${lng}. Response:`, JSON.stringify(owmGeoData).substring(0,200));
            }
          } else {
            const errorBody = await geoResponse.text();
            console.warn(`[enrich-weather] Geocoding API request failed for activity ${activity.id}: ${geoResponse.status} - ${errorBody.substring(0,200)}`);
          }
        } catch (geoError) {
          console.error(`[enrich-weather] Error fetching geocoding for activity ${activity.id}:`, geoError.message);
        }

        return {
          ...activity,
          weather_data: weatherData,
          city: geoData.city,
          state: geoData.state,
          country: geoData.country,
        };
      })
    );

    const finalEnrichedCount = enrichedActivities.filter(a => a.weather_data !== null).length;
    const finalGeocodedCount = enrichedActivities.filter(a => a.city !== null || a.state !== null || a.country !== null).length;
    console.log(`[enrich-weather] Processing complete. Enriched weather for ${finalEnrichedCount}/${activities.length}. Geocoded ${finalGeocodedCount}/${activities.length}.`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        activities: enrichedActivities,
        enriched_count: finalEnrichedCount,
        geocoded_count: finalGeocodedCount,
        total_count: activities.length,
      }),
    };

  } catch (error) {
    console.error('[enrich-weather] Critical error in handler:', error);
    if (error instanceof SyntaxError && error.message.includes("JSON.parse")) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid request body: Not valid JSON."}) };
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to enrich activities due to an unexpected server error', message: error.message }),
    };
  }
};
