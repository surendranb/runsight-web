// Ensure this matches how API keys are accessed in weather.ts (process.env or import.meta.env)
const OPENWEATHER_API_KEY = process.env.VITE_OPENWEATHER_API_KEY || (import.meta.env && import.meta.env.VITE_OPENWEATHER_API_KEY);

if (!OPENWEATHER_API_KEY) {
  console.warn('OpenWeatherMap API key not found. Please set VITE_OPENWEATHER_API_KEY. Reverse geocoding will not work.');
}

export interface GeocodeLocationInfo {
  city: string | null;
  state: string | null;
  country: string | null; // OWM provides country code e.g. "US", "GB"
}

export const fetchReverseGeocodeData = async (lat: number, lon: number): Promise<GeocodeLocationInfo | null> => {
  if (!OPENWEATHER_API_KEY) {
    console.error('OpenWeatherMap API key is not configured. Cannot fetch reverse geocode data.');
    return null;
  }

  if (lat === undefined || lon === undefined || lat === null || lon === null) {
    console.warn('Invalid latitude or longitude provided for reverse geocoding.', { lat, lon });
    return null;
  }

  const apiUrl = `http://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHER_API_KEY}`;
  console.log(`Fetching reverse geocode data for lat: ${lat}, lon: ${lon}`);

  try {
    const response = await fetch(apiUrl);
    const responseText = await response.text(); // Read text first for better error logging

    if (!response.ok) {
      console.error(`Failed to fetch reverse geocode data: ${response.status} ${response.statusText}. Response: ${responseText.substring(0, 500)}`);
      return null;
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON response for reverse geocoding:', parseError);
      console.error(`Response text was: ${responseText.substring(0, 500)}...`);
      return null;
    }


    if (!responseData || !Array.isArray(responseData) || responseData.length === 0) {
      console.warn(`No reverse geocode data found for lat: ${lat}, lon: ${lon}. Response:`, responseData);
      return null;
    }

    const locationData = responseData[0];

    if (!locationData) {
        console.warn(`First element in reverse geocode response is missing for lat: ${lat}, lon: ${lon}. Response:`, responseData);
        return null;
    }

    const result: GeocodeLocationInfo = {
      city: locationData.name || null,
      state: locationData.state || null,
      country: locationData.country || null, // OWM provides country code e.g. "US", "GB"
    };

    console.log(`Successfully fetched reverse geocode data for lat: ${lat}, lon: ${lon}:`, result);
    return result;

  } catch (error) {
    console.error(`An error occurred during reverse geocoding fetch for lat: ${lat}, lon: ${lon}:`, error);
    return null;
  }
};
