import { supabase } from './supabase';

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

export const fetchWeatherData = async (lat: number, lon: number, date: string) => {
  // Convert date to timestamp
  const timestamp = Math.floor(new Date(date).getTime() / 1000);
  
  const response = await fetch(
    `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${timestamp}&appid=${OPENWEATHER_API_KEY}&units=metric`
  );

  if (!response.ok) {
    // Fallback to current weather if historical data fails
    const currentResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    
    if (!currentResponse.ok) {
      throw new Error('Failed to fetch weather data');
    }
    
    const currentWeather = await currentResponse.json();
    return {
      data: {
        temp: currentWeather.main.temp,
        feels_like: currentWeather.main.feels_like,
        humidity: currentWeather.main.humidity,
        pressure: currentWeather.main.pressure,
        visibility: currentWeather.visibility,
        wind_speed: currentWeather.wind.speed,
        wind_deg: currentWeather.wind.deg,
        weather: currentWeather.weather[0],
        clouds: currentWeather.clouds.all,
      }
    };
  }

  const data = await response.json();
  return {
    data: {
      temp: data.data[0].temp,
      feels_like: data.data[0].feels_like,
      humidity: data.data[0].humidity,
      pressure: data.data[0].pressure,
      visibility: data.data[0].visibility,
      wind_speed: data.data[0].wind_speed,
      wind_deg: data.data[0].wind_deg,
      weather: data.data[0].weather[0],
      clouds: data.data[0].clouds,
    }
  };
};

export const saveWeatherToDatabase = async (weatherData: any, activityId: string) => {
  // Skip database save if using temporary activity (RLS issue)
  if (activityId.startsWith('temp_')) {
    console.warn('Skipping weather save for temporary activity due to RLS policy');
    return {
      id: `temp_weather_${activityId}`,
      activity_id: activityId,
      temperature: weatherData.temp,
      feels_like: weatherData.feels_like,
      humidity: weatherData.humidity,
      pressure: weatherData.pressure,
      visibility: weatherData.visibility,
      wind_speed: weatherData.wind_speed,
      wind_deg: weatherData.wind_deg,
      weather_main: weatherData.weather.main,
      weather_description: weatherData.weather.description,
      weather_icon: weatherData.weather.icon,
      clouds: weatherData.clouds,
    };
  }

  const { data, error } = await supabase
    .from('weather')
    .upsert({
      activity_id: activityId,
      temperature: weatherData.temp,
      feels_like: weatherData.feels_like,
      humidity: weatherData.humidity,
      pressure: weatherData.pressure,
      visibility: weatherData.visibility,
      wind_speed: weatherData.wind_speed,
      wind_deg: weatherData.wind_deg,
      weather_main: weatherData.weather.main,
      weather_description: weatherData.weather.description,
      weather_icon: weatherData.weather.icon,
      clouds: weatherData.clouds,
    })
    .select()
    .single();

  if (error) {
    console.error('Weather save error:', error);
    throw error;
  }
  return data;
};