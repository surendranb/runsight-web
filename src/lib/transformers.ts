// Data transformation utilities for converting between different data formats

import { StravaActivity, EnrichedActivity, WeatherData, GeocodingData } from '../types/sync';
import { sanitizeString, sanitizeNumber, sanitizeCoordinate } from './validation';

// Transform Strava API activity to our enriched activity format
export function transformStravaToEnriched(
  stravaActivity: StravaActivity,
  userId: string,
  syncSessionId?: string
): Partial<EnrichedActivity> {
  // Extract coordinates from Strava's latlng arrays
  const startLat = stravaActivity.start_latlng?.[0];
  const startLng = stravaActivity.start_latlng?.[1];
  const endLat = stravaActivity.end_latlng?.[0];
  const endLng = stravaActivity.end_latlng?.[1];

  return {
    user_id: userId,
    strava_id: stravaActivity.id,
    name: sanitizeString(stravaActivity.name, 500),
    activity_type: sanitizeString(stravaActivity.type, 50) || 'Run',
    distance_meters: sanitizeNumber(stravaActivity.distance, 0) || 0,
    moving_time_seconds: sanitizeNumber(stravaActivity.moving_time, 0) || 0,
    elapsed_time_seconds: sanitizeNumber(stravaActivity.elapsed_time, 0) || 0,
    start_date_utc: stravaActivity.start_date,
    start_date_local: stravaActivity.start_date_local,
    timezone: sanitizeString(stravaActivity.timezone, 100),
    
    // Location data
    start_latitude: sanitizeCoordinate(startLat, true),
    start_longitude: sanitizeCoordinate(startLng, false),
    end_latitude: sanitizeCoordinate(endLat, true),
    end_longitude: sanitizeCoordinate(endLng, false),
    city: sanitizeString(stravaActivity.location_city, 100),
    state: sanitizeString(stravaActivity.location_state, 100),
    country: sanitizeString(stravaActivity.location_country, 100),
    
    // Performance metrics
    average_speed_ms: sanitizeNumber(stravaActivity.average_speed, 0),
    max_speed_ms: sanitizeNumber(stravaActivity.max_speed, 0),
    average_heartrate_bpm: sanitizeNumber(stravaActivity.average_heartrate, 30, 250),
    max_heartrate_bpm: sanitizeNumber(stravaActivity.max_heartrate, 30, 250),
    total_elevation_gain_meters: sanitizeNumber(stravaActivity.total_elevation_gain, 0),
    
    // Metadata
    enrichment_status: {
      weather: false,
      geocoding: false
    },
    strava_data: stravaActivity, // Store full Strava payload
    sync_session_id: syncSessionId
  };
}

// Transform weather API response to our structured format
export function transformWeatherData(
  weatherResponse: any,
  activity: Partial<EnrichedActivity>
): Partial<EnrichedActivity> {
  if (!weatherResponse || !weatherResponse.data || weatherResponse.data.length === 0) {
    return {
      ...activity,
      enrichment_status: {
        ...activity.enrichment_status,
        weather: false,
        errors: [...(activity.enrichment_status?.errors || []), 'No weather data available']
      }
    };
  }

  const weatherData = weatherResponse.data[0];
  const weatherConditions = weatherData.weather || [];
  const primaryCondition = weatherConditions[0];

  return {
    ...activity,
    temperature_celsius: sanitizeNumber(weatherData.temp, -50, 60),
    feels_like_celsius: sanitizeNumber(weatherData.feels_like, -50, 60),
    humidity_percent: sanitizeNumber(weatherData.humidity, 0, 100),
    pressure_hpa: sanitizeNumber(weatherData.pressure, 800, 1200),
    wind_speed_ms: sanitizeNumber(weatherData.wind_speed, 0),
    wind_direction_degrees: sanitizeNumber(weatherData.wind_deg, 0, 360),
    weather_condition: sanitizeString(primaryCondition?.main, 50),
    visibility_meters: sanitizeNumber(weatherData.visibility, 0),
    uv_index: sanitizeNumber(weatherData.uvi, 0),
    enrichment_status: {
      ...activity.enrichment_status,
      weather: true
    }
  };
}

// Transform geocoding API response
export function transformGeocodingData(
  geocodingResponse: any,
  activity: Partial<EnrichedActivity>
): Partial<EnrichedActivity> {
  if (!geocodingResponse || geocodingResponse.length === 0) {
    return {
      ...activity,
      enrichment_status: {
        ...activity.enrichment_status,
        geocoding: false,
        errors: [...(activity.enrichment_status?.errors || []), 'No geocoding data available']
      }
    };
  }

  const location = geocodingResponse[0];

  return {
    ...activity,
    city: sanitizeString(location.name, 100) || activity.city,
    state: sanitizeString(location.state, 100) || activity.state,
    country: sanitizeString(location.country, 100) || activity.country,
    enrichment_status: {
      ...activity.enrichment_status,
      geocoding: true
    }
  };
}

// Transform enriched activity for database storage (ensure all required fields)
export function transformForDatabase(activity: Partial<EnrichedActivity>): EnrichedActivity {
  if (!activity.user_id || !activity.strava_id) {
    throw new Error('Missing required fields for database storage');
  }

  return {
    user_id: activity.user_id,
    strava_id: activity.strava_id,
    name: activity.name || 'Unnamed Activity',
    activity_type: activity.activity_type || 'Run',
    distance_meters: activity.distance_meters || 0,
    moving_time_seconds: activity.moving_time_seconds || 0,
    elapsed_time_seconds: activity.elapsed_time_seconds || 0,
    start_date_utc: activity.start_date_utc || new Date().toISOString(),
    start_date_local: activity.start_date_local || new Date().toISOString(),
    timezone: activity.timezone,
    
    // Location data (optional)
    start_latitude: activity.start_latitude,
    start_longitude: activity.start_longitude,
    end_latitude: activity.end_latitude,
    end_longitude: activity.end_longitude,
    city: activity.city,
    state: activity.state,
    country: activity.country,
    
    // Performance metrics (optional)
    average_speed_ms: activity.average_speed_ms,
    max_speed_ms: activity.max_speed_ms,
    average_heartrate_bpm: activity.average_heartrate_bpm,
    max_heartrate_bpm: activity.max_heartrate_bpm,
    total_elevation_gain_meters: activity.total_elevation_gain_meters,
    
    // Weather data (optional)
    temperature_celsius: activity.temperature_celsius,
    feels_like_celsius: activity.feels_like_celsius,
    humidity_percent: activity.humidity_percent,
    pressure_hpa: activity.pressure_hpa,
    wind_speed_ms: activity.wind_speed_ms,
    wind_direction_degrees: activity.wind_direction_degrees,
    weather_condition: activity.weather_condition,
    visibility_meters: activity.visibility_meters,
    uv_index: activity.uv_index,
    
    // Metadata
    enrichment_status: activity.enrichment_status || { weather: false, geocoding: false },
    strava_data: activity.strava_data,
    sync_session_id: activity.sync_session_id,
    
    // Timestamps (will be set by database if not provided)
    id: activity.id,
    created_at: activity.created_at,
    updated_at: activity.updated_at
  };
}

// Transform database activity back to frontend format (for backward compatibility)
export function transformToLegacyFormat(activity: EnrichedActivity): any {
  return {
    id: activity.id,
    user_id: activity.user_id,
    strava_id: activity.strava_id,
    name: activity.name,
    distance: activity.distance_meters, // Legacy field name
    moving_time: activity.moving_time_seconds, // Legacy field name
    elapsed_time: activity.elapsed_time_seconds, // Legacy field name
    start_date: activity.start_date_utc, // Legacy field name
    start_date_local: activity.start_date_local,
    start_latlng: activity.start_latitude && activity.start_longitude 
      ? `(${activity.start_latitude},${activity.start_longitude})` 
      : null, // Legacy point format
    end_latlng: activity.end_latitude && activity.end_longitude 
      ? `(${activity.end_latitude},${activity.end_longitude})` 
      : null, // Legacy point format
    average_speed: activity.average_speed_ms, // Legacy field name
    max_speed: activity.max_speed_ms, // Legacy field name
    average_heartrate: activity.average_heartrate_bpm, // Legacy field name
    max_heartrate: activity.max_heartrate_bpm, // Legacy field name
    total_elevation_gain: activity.total_elevation_gain_meters, // Legacy field name
    
    // Weather data as JSONB (legacy format)
    weather_data: activity.temperature_celsius ? {
      temperature: activity.temperature_celsius,
      feels_like: activity.feels_like_celsius,
      humidity: activity.humidity_percent,
      pressure: activity.pressure_hpa,
      wind_speed: activity.wind_speed_ms,
      wind_deg: activity.wind_direction_degrees,
      weather: {
        main: activity.weather_condition
      },
      visibility: activity.visibility_meters,
      uvi: activity.uv_index
    } : null,
    
    city: activity.city,
    state: activity.state,
    country: activity.country,
    strava_data: activity.strava_data,
    created_at: activity.created_at,
    updated_at: activity.updated_at
  };
}

// Calculate derived metrics
export function calculateDerivedMetrics(activity: Partial<EnrichedActivity>): Partial<EnrichedActivity> {
  const result = { ...activity };

  // Calculate pace (seconds per kilometer)
  if (result.distance_meters && result.moving_time_seconds && result.distance_meters > 0) {
    const paceSecondsPerKm = result.moving_time_seconds / (result.distance_meters / 1000);
    result.strava_data = {
      ...result.strava_data,
      pace_seconds_per_km: Math.round(paceSecondsPerKm)
    };
  }

  // Calculate speed in km/h from m/s
  if (result.average_speed_ms) {
    result.strava_data = {
      ...result.strava_data,
      average_speed_kmh: Math.round(result.average_speed_ms * 3.6 * 100) / 100
    };
  }

  if (result.max_speed_ms) {
    result.strava_data = {
      ...result.strava_data,
      max_speed_kmh: Math.round(result.max_speed_ms * 3.6 * 100) / 100
    };
  }

  return result;
}

// Batch transformation utility
export function transformBatch<T, R>(
  items: T[],
  transformer: (item: T) => R,
  onError?: (item: T, error: Error) => void
): R[] {
  const results: R[] = [];
  
  for (const item of items) {
    try {
      const transformed = transformer(item);
      results.push(transformed);
    } catch (error) {
      if (onError) {
        onError(item, error as Error);
      } else {
        console.error('Transformation error:', error);
      }
    }
  }
  
  return results;
}