// Weather Enrichment Service - Enriches activities with weather and location data

import { 
  NetworkError, 
  RateLimitError, 
  ValidationError,
  withRetry,
  CircuitBreaker,
  classifyError,
  DEFAULT_RETRY_OPTIONS,
  ErrorCollector
} from './errors';
import { EnrichedActivity, WeatherData, GeocodingData } from '../types/sync';
import { transformWeatherData, transformGeocodingData } from './transformers';
import { validateWeatherData } from './validation';

export interface WeatherEnrichmentOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  batchSize?: number;
  enableCircuitBreaker?: boolean;
  rateLimitBuffer?: number;
  includeGeocoding?: boolean;
}

export interface EnrichmentResult {
  enrichedActivities: EnrichedActivity[];
  metadata: {
    weatherEnriched: number;
    geocoded: number;
    failed: number;
    skipped: number;
    errors: Array<{
      activityId: number;
      error: string;
      type: string;
    }>;
  };
}

export class WeatherEnricher {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openweathermap.org';
  private readonly options: Required<WeatherEnrichmentOptions>;
  private readonly circuitBreaker: CircuitBreaker;
  private rateLimitState: {
    callsPerMinute: number;
    callsPerDay: number;
    minuteResetTime: number;
    dayResetTime: number;
  } = {
    callsPerMinute: 0,
    callsPerDay: 0,
    minuteResetTime: Date.now() + 60000,
    dayResetTime: Date.now() + 86400000
  };

  constructor(options: WeatherEnrichmentOptions = {}) {
    this.apiKey = process.env.VITE_OPENWEATHER_API_KEY || process.env.OPENWEATHER_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('Missing OpenWeatherMap API key in environment variables');
    }

    this.options = {
      maxRetries: options.maxRetries || 3,
      baseDelay: options.baseDelay || 1000,
      maxDelay: options.maxDelay || 30000,
      batchSize: options.batchSize || 10,
      enableCircuitBreaker: options.enableCircuitBreaker !== false,
      rateLimitBuffer: options.rateLimitBuffer || 5,
      includeGeocoding: options.includeGeocoding !== false
    };

    this.circuitBreaker = new CircuitBreaker(5, 60000); // 5 failures, 1 minute recovery
  }

  // Make request to OpenWeatherMap API
  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, string | number> = {}
  ): Promise<T> {
    // Check rate limits before making request
    await this.checkRateLimit();

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('appid', this.apiKey);
    
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value.toString());
    }

    const executeRequest = async (): Promise<T> => {
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'RunSight/1.0'
        }
      });

      // Update rate limit counters
      this.updateRateLimitState();

      if (!response.ok) {
        await this.handleErrorResponse(response, endpoint);
      }

      return await response.json();
    };

    // Use circuit breaker if enabled
    if (this.options.enableCircuitBreaker) {
      return await this.circuitBreaker.execute(executeRequest, 'enriching');
    } else {
      return await executeRequest();
    }
  }

  // Handle error responses from OpenWeatherMap API
  private async handleErrorResponse(response: Response, endpoint: string): Promise<never> {
    const status = response.status;
    let errorBody: any = {};
    
    try {
      errorBody = await response.json();
    } catch {
      // Response body is not JSON
    }

    const context = {
      endpoint,
      status,
      statusText: response.statusText,
      error: errorBody
    };

    switch (status) {
      case 401:
        throw new Error(`Invalid API key: ${errorBody.message || 'Authentication failed'}`);

      case 429:
        throw new RateLimitError(
          `Weather API rate limit exceeded: ${errorBody.message || 'Too many requests'}`,
          'enriching',
          60 // Wait 1 minute
        );

      case 404:
        throw new Error(`Weather data not found: ${errorBody.message || 'No data available'}`);

      case 500:
      case 502:
      case 503:
      case 504:
        throw new NetworkError(
          `Weather API server error: ${status} ${response.statusText}`,
          'enriching',
          context
        );

      default:
        throw new NetworkError(
          `Weather API error: ${status} ${errorBody.message || response.statusText}`,
          'enriching',
          context
        );
    }
  }

  // Update rate limit state (OpenWeatherMap: 60 calls/minute, 1000 calls/day for free tier)
  private updateRateLimitState(): void {
    const now = Date.now();
    
    // Reset minute counter if needed
    if (now > this.rateLimitState.minuteResetTime) {
      this.rateLimitState.callsPerMinute = 0;
      this.rateLimitState.minuteResetTime = now + 60000;
    }
    
    // Reset day counter if needed
    if (now > this.rateLimitState.dayResetTime) {
      this.rateLimitState.callsPerDay = 0;
      this.rateLimitState.dayResetTime = now + 86400000;
    }
    
    this.rateLimitState.callsPerMinute++;
    this.rateLimitState.callsPerDay++;
    
    console.log(`[WeatherEnricher] Rate limit state: ${this.rateLimitState.callsPerMinute}/60 (minute), ${this.rateLimitState.callsPerDay}/1000 (day)`);
  }

  // Check if we're approaching rate limits
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Check minute limit (60 calls/minute)
    if (this.rateLimitState.callsPerMinute >= 55) { // Buffer of 5
      const waitTime = Math.max(0, this.rateLimitState.minuteResetTime - now) / 1000;
      console.warn(`[WeatherEnricher] Approaching minute rate limit, waiting ${waitTime}s`);
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000 + 1000)); // Extra 1s buffer
    }

    // Check daily limit (1000 calls/day)
    if (this.rateLimitState.callsPerDay >= 950) { // Buffer of 50
      throw new RateLimitError(
        'Approaching daily weather API limit',
        'enriching',
        86400 // Wait 24 hours
      );
    }
  }

  // Get historical weather data for a specific location and time
  async getHistoricalWeather(
    latitude: number,
    longitude: number,
    timestamp: number
  ): Promise<WeatherData | null> {
    try {
      const response = await withRetry(
        () => this.makeRequest<any>('/data/3.0/onecall/timemachine', {
          lat: latitude,
          lon: longitude,
          dt: timestamp,
          units: 'metric'
        }),
        'enriching',
        {
          ...DEFAULT_RETRY_OPTIONS,
          maxRetries: this.options.maxRetries,
          baseDelay: this.options.baseDelay,
          maxDelay: this.options.maxDelay
        }
      );

      if (!response.data || response.data.length === 0) {
        return null;
      }

      const weatherData = response.data[0];
      return validateWeatherData({
        temperature: weatherData.temp,
        feels_like: weatherData.feels_like,
        humidity: weatherData.humidity,
        pressure: weatherData.pressure,
        wind_speed: weatherData.wind_speed,
        wind_deg: weatherData.wind_deg,
        weather_conditions: weatherData.weather || [],
        uvi: weatherData.uvi,
        visibility: weatherData.visibility
      });

    } catch (error) {
      console.warn(`[WeatherEnricher] Failed to get weather for ${latitude},${longitude} at ${timestamp}:`, error);
      return null;
    }
  }

  // Get geocoding data for coordinates
  async getGeocodingData(
    latitude: number,
    longitude: number
  ): Promise<GeocodingData | null> {
    try {
      const response = await withRetry(
        () => this.makeRequest<any[]>('/geo/1.0/reverse', {
          lat: latitude,
          lon: longitude,
          limit: 1
        }),
        'enriching',
        {
          ...DEFAULT_RETRY_OPTIONS,
          maxRetries: this.options.maxRetries,
          baseDelay: this.options.baseDelay,
          maxDelay: this.options.maxDelay
        }
      );

      if (!response || response.length === 0) {
        return null;
      }

      const location = response[0];
      return {
        city: location.name || undefined,
        state: location.state || undefined,
        country: location.country || undefined
      };

    } catch (error) {
      console.warn(`[WeatherEnricher] Failed to get geocoding for ${latitude},${longitude}:`, error);
      return null;
    }
  }

  // Enrich a single activity with weather and location data
  async enrichActivity(activity: Partial<EnrichedActivity>): Promise<EnrichedActivity> {
    let enrichedActivity = { ...activity } as EnrichedActivity;

    // Skip if no GPS coordinates
    if (!activity.start_latitude || !activity.start_longitude || !activity.start_date_utc) {
      console.log(`[WeatherEnricher] Skipping activity ${activity.strava_id} - missing GPS or date`);
      return {
        ...enrichedActivity,
        enrichment_status: {
          ...enrichedActivity.enrichment_status,
          weather: false,
          geocoding: false,
          errors: [...(enrichedActivity.enrichment_status?.errors || []), 'Missing GPS coordinates or date']
        }
      };
    }

    const timestamp = Math.floor(new Date(activity.start_date_utc).getTime() / 1000);
    const errors: string[] = [];

    try {
      // Get weather data
      const weatherData = await this.getHistoricalWeather(
        activity.start_latitude,
        activity.start_longitude,
        timestamp
      );

      if (weatherData) {
        enrichedActivity = transformWeatherData({ data: [weatherData] }, enrichedActivity);
        console.log(`[WeatherEnricher] Enriched activity ${activity.strava_id} with weather data`);
      } else {
        errors.push('Weather data not available');
      }

    } catch (error) {
      console.warn(`[WeatherEnricher] Weather enrichment failed for activity ${activity.strava_id}:`, error);
      errors.push(`Weather enrichment failed: ${(error as Error).message}`);
    }

    // Get geocoding data if enabled and not already present
    if (this.options.includeGeocoding && (!activity.city || !activity.state || !activity.country)) {
      try {
        const geocodingData = await this.getGeocodingData(
          activity.start_latitude,
          activity.start_longitude
        );

        if (geocodingData) {
          enrichedActivity = transformGeocodingData([geocodingData], enrichedActivity);
          console.log(`[WeatherEnricher] Enriched activity ${activity.strava_id} with geocoding data`);
        } else {
          errors.push('Geocoding data not available');
        }

      } catch (error) {
        console.warn(`[WeatherEnricher] Geocoding failed for activity ${activity.strava_id}:`, error);
        errors.push(`Geocoding failed: ${(error as Error).message}`);
      }
    }

    // Update enrichment status
    if (errors.length > 0) {
      enrichedActivity.enrichment_status = {
        ...enrichedActivity.enrichment_status,
        errors: [...(enrichedActivity.enrichment_status?.errors || []), ...errors]
      };
    }

    return enrichedActivity;
  }

  // Batch enrich multiple activities
  async enrichActivities(
    activities: Partial<EnrichedActivity>[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<EnrichmentResult> {
    const errorCollector = new ErrorCollector();
    const enrichedActivities: EnrichedActivity[] = [];
    let weatherEnriched = 0;
    let geocoded = 0;
    let failed = 0;
    let skipped = 0;

    console.log(`[WeatherEnricher] Starting batch enrichment of ${activities.length} activities`);

    // Process activities in batches to respect rate limits
    for (let i = 0; i < activities.length; i += this.options.batchSize) {
      const batch = activities.slice(i, i + this.options.batchSize);
      
      console.log(`[WeatherEnricher] Processing batch ${Math.floor(i / this.options.batchSize) + 1}/${Math.ceil(activities.length / this.options.batchSize)}`);

      // Process batch with some parallelism but not too much to avoid rate limits
      const batchPromises = batch.map(async (activity, index) => {
        try {
          // Add small delay between requests in the same batch
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          const enriched = await this.enrichActivity(activity);
          
          // Count successful enrichments
          if (enriched.enrichment_status.weather) weatherEnriched++;
          if (enriched.enrichment_status.geocoding) geocoded++;
          
          return enriched;
        } catch (error) {
          failed++;
          errorCollector.addFromCatch(error, 'enriching');
          
          // Return activity with error status
          return {
            ...activity,
            enrichment_status: {
              weather: false,
              geocoding: false,
              errors: [`Enrichment failed: ${(error as Error).message}`]
            }
          } as EnrichedActivity;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      enrichedActivities.push(...batchResults);

      // Report progress
      if (onProgress) {
        onProgress(i + batch.length, activities.length);
      }

      // Add delay between batches to be respectful to the API
      if (i + this.options.batchSize < activities.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Count activities that were skipped (no GPS coordinates)
    skipped = enrichedActivities.filter(activity => 
      activity.enrichment_status.errors?.some(error => 
        error.includes('Missing GPS coordinates')
      )
    ).length;

    const errors = errorCollector.getErrors().map(error => ({
      activityId: error.context.activityId || 0,
      error: error.message,
      type: error.type
    }));

    console.log(`[WeatherEnricher] Batch enrichment completed: ${weatherEnriched} weather, ${geocoded} geocoded, ${failed} failed, ${skipped} skipped`);

    return {
      enrichedActivities,
      metadata: {
        weatherEnriched,
        geocoded,
        failed,
        skipped,
        errors
      }
    };
  }

  // Get current rate limit status
  getRateLimitStatus(): {
    minute: { usage: number; limit: number; percentage: number; resetTime: string };
    day: { usage: number; limit: number; percentage: number; resetTime: string };
  } {
    return {
      minute: {
        usage: this.rateLimitState.callsPerMinute,
        limit: 60,
        percentage: Math.round((this.rateLimitState.callsPerMinute / 60) * 100),
        resetTime: new Date(this.rateLimitState.minuteResetTime).toISOString()
      },
      day: {
        usage: this.rateLimitState.callsPerDay,
        limit: 1000,
        percentage: Math.round((this.rateLimitState.callsPerDay / 1000) * 100),
        resetTime: new Date(this.rateLimitState.dayResetTime).toISOString()
      }
    };
  }

  // Get circuit breaker status
  getCircuitBreakerStatus(): { state: string; failures: number; lastFailureTime: number } {
    return this.circuitBreaker.getState();
  }

  // Check if weather enrichment is available (API key configured and rate limits OK)
  isAvailable(): boolean {
    return !!this.apiKey && this.rateLimitState.callsPerDay < 950;
  }

  // Estimate how many activities can be enriched with current rate limits
  estimateCapacity(): {
    remainingToday: number;
    remainingThisMinute: number;
    estimatedBatchSize: number;
  } {
    const remainingToday = Math.max(0, 950 - this.rateLimitState.callsPerDay);
    const remainingThisMinute = Math.max(0, 55 - this.rateLimitState.callsPerMinute);
    
    // Each activity needs 1-2 API calls (weather + optional geocoding)
    const callsPerActivity = this.options.includeGeocoding ? 2 : 1;
    
    return {
      remainingToday,
      remainingThisMinute,
      estimatedBatchSize: Math.floor(remainingToday / callsPerActivity)
    };
  }
}

// Export singleton instance
export const weatherEnricher = new WeatherEnricher();