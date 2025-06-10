// import { supabase } from './supabase'; // No longer needed if saveWeatherToDatabase is removed

const OPENWEATHER_API_KEY = process.env.VITE_OPENWEATHER_API_KEY || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENWEATHER_API_KEY);

export interface EnrichedWeatherInfo {
  weather_timestamp: number; // Unix timestamp from OWM dt
  temperature: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  visibility_meters: number;
  wind_speed: number;
  wind_deg: number;
  weather_main: string;
  weather_description: string;
  weather_icon: string;
  clouds_percent: number;
  sunrise_time: number; // Unix timestamp from OWM sunrise
  sunset_time: number; // Unix timestamp from OWM sunset
}

export const fetchWeatherData = async (lat: number, lon: number, date: string): Promise<EnrichedWeatherInfo | null> => {
  if (!OPENWEATHER_API_KEY) {
    console.warn('OpenWeatherMap API key not found. Please set VITE_OPENWEATHER_API_KEY. Weather fetching disabled.');
    return null;
  }

  // Convert date to timestamp for historical API
  const timestamp = Math.floor(new Date(date).getTime() / 1000);
  
  const historicalApiUrl = `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${timestamp}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  console.log(`Fetching historical weather from: ${historicalApiUrl}`);

  try {
    const response = await fetch(historicalApiUrl);

    if (!response.ok) {
      console.warn(`Historical weather API call failed with status ${response.status}. Response: ${await response.text()}. Falling back to current weather.`);
      // Fallback to current weather if historical data fails
      const currentWeatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
      console.log(`Fetching current weather from: ${currentWeatherApiUrl}`);
      const currentResponse = await fetch(currentWeatherApiUrl);

      if (!currentResponse.ok) {
        console.error(`Current weather API call also failed with status ${currentResponse.status}. Response: ${await currentResponse.text()}. Cannot fetch weather data.`);
        return null; // Or throw new Error('Failed to fetch any weather data');
      }

      const currentWeatherData = await currentResponse.json();
      if (!currentWeatherData || !currentWeatherData.main || !currentWeatherData.weather || currentWeatherData.weather.length === 0) {
        console.error('Current weather data is incomplete.', currentWeatherData);
        return null;
      }

      return {
        weather_timestamp: currentWeatherData.dt,
        temperature: currentWeatherData.main.temp,
        feels_like: currentWeatherData.main.feels_like,
        humidity: currentWeatherData.main.humidity,
        pressure: currentWeatherData.main.pressure,
        visibility_meters: currentWeatherData.visibility, // visibility is in meters
        wind_speed: currentWeatherData.wind.speed,
        wind_deg: currentWeatherData.wind.deg,
        weather_main: currentWeatherData.weather[0].main,
        weather_description: currentWeatherData.weather[0].description,
        weather_icon: currentWeatherData.weather[0].icon,
        clouds_percent: currentWeatherData.clouds.all, // clouds.all is percentage
        sunrise_time: currentWeatherData.sys.sunrise,
        sunset_time: currentWeatherData.sys.sunset,
      };
    }

    // Process historical data
    const historicalData = await response.json();
    if (!historicalData.data || historicalData.data.length === 0) {
      console.warn('Historical weather API returned success but no data. Response:', historicalData);
      // Potentially fallback to current weather here as well, or return null
      return null;
    }

    const weatherEntry = historicalData.data[0];
    if (!weatherEntry || !weatherEntry.weather || weatherEntry.weather.length === 0) {
        console.error('Historical weather data entry is incomplete.', weatherEntry);
        return null;
    }

    return {
      weather_timestamp: weatherEntry.dt,
      temperature: weatherEntry.temp,
      feels_like: weatherEntry.feels_like,
      humidity: weatherEntry.humidity,
      pressure: weatherEntry.pressure,
      visibility_meters: weatherEntry.visibility, // visibility is in meters
      wind_speed: weatherEntry.wind_speed,
      wind_deg: weatherEntry.wind_deg,
      weather_main: weatherEntry.weather[0].main,
      weather_description: weatherEntry.weather[0].description,
      weather_icon: weatherEntry.weather[0].icon,
      clouds_percent: weatherEntry.clouds, // In /timemachine, 'clouds' is the percentage directly
      sunrise_time: weatherEntry.sunrise,
      sunset_time: weatherEntry.sunset,
    };

  } catch (error) {
    console.error('Error fetching or processing weather data:', error);
    return null;
  }
};

// /**
//  * @deprecated Weather data is now saved as part of the enriched_runs record.
//  * This function is no longer used and will be removed in a future version.
//  */
// export const saveWeatherToDatabase = async (weatherData: any, activityId: string) => {
//   // Validate and extract weather data with fallbacks
//   const safeWeatherData = {
//     activity_id: activityId,
//     temperature: weatherData.temp || null,
//     feels_like: weatherData.feels_like || null,
//     humidity: weatherData.humidity || null,
//     pressure: weatherData.pressure || null,
//     visibility: weatherData.visibility || null,
//     wind_speed: weatherData.wind_speed || null,
//     wind_deg: weatherData.wind_deg || null,
//     weather_main: weatherData.weather?.main || null,
//     weather_description: weatherData.weather?.description || null,
//     weather_icon: weatherData.weather?.icon || null,
//     clouds: weatherData.clouds || null,
//   };

//   console.log('Saving weather data:', safeWeatherData);

//   // Skip database save if using temporary activity (RLS issue)
//   if (activityId.startsWith('temp_')) {
//     console.warn('Skipping weather save for temporary activity due to RLS policy');
//     return {
//       id: `temp_weather_${activityId}`,
//       ...safeWeatherData
//     };
//   }

//   const { data, error } = await supabase
//     .from('weather')
//     .upsert(safeWeatherData)
//     .select()
//     .single();

//   if (error) {
//     console.error('Weather save error:', error);
//     console.error('Failed weather data:', safeWeatherData);
//     throw error;
//   }
  
//   console.log('Weather saved successfully:', data);
//   return data;
// };