// Strava API Client with robust error handling, rate limiting, and pagination

import { authManager } from './auth-manager';
import { 
  NetworkError, 
  RateLimitError, 
  AuthenticationError, 
  ValidationError,
  withRetry,
  CircuitBreaker,
  classifyError,
  DEFAULT_RETRY_OPTIONS
} from './errors';
import { StravaActivity, PaginationParams, PaginationResponse } from '../types/sync';
import { validateStravaActivity } from './validation';

export interface StravaApiOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  enableCircuitBreaker?: boolean;
  rateLimitBuffer?: number; // Seconds to wait extra after rate limit
}

export class StravaClient {
  private readonly baseUrl = 'https://www.strava.com/api/v3';
  private readonly options: Required<StravaApiOptions>;
  private readonly circuitBreaker: CircuitBreaker;
  private rateLimitState: {
    dailyUsage: number;
    dailyLimit: number;
    shortTermUsage: number;
    shortTermLimit: number;
    resetTime: number;
  } = {
    dailyUsage: 0,
    dailyLimit: 1000,
    shortTermUsage: 0,
    shortTermLimit: 100,
    resetTime: 0
  };

  constructor(options: StravaApiOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries || 3,
      baseDelay: options.baseDelay || 1000,
      maxDelay: options.maxDelay || 30000,
      enableCircuitBreaker: options.enableCircuitBreaker !== false,
      rateLimitBuffer: options.rateLimitBuffer || 5
    };

    this.circuitBreaker = new CircuitBreaker(5, 60000); // 5 failures, 1 minute recovery
  }

  // Make authenticated request to Strava API
  private async makeRequest<T>(
    endpoint: string,
    userId: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Check rate limits before making request
    await this.checkRateLimit();

    // Get valid access token
    const accessToken = await authManager.authenticateRequest(userId);

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'User-Agent': 'RunSight/1.0',
        ...options.headers
      }
    };

    const executeRequest = async (): Promise<T> => {
      const response = await fetch(url, requestOptions);
      
      // Update rate limit state from response headers
      this.updateRateLimitState(response);

      if (!response.ok) {
        await this.handleErrorResponse(response, endpoint);
      }

      return await response.json();
    };

    // Use circuit breaker if enabled
    if (this.options.enableCircuitBreaker) {
      return await this.circuitBreaker.execute(executeRequest, 'fetching');
    } else {
      return await executeRequest();
    }
  }

  // Handle error responses from Strava API
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
        throw new AuthenticationError(
          `Authentication failed: ${errorBody.message || 'Invalid or expired token'}`,
          'fetching',
          context
        );

      case 403:
        throw new AuthenticationError(
          `Access forbidden: ${errorBody.message || 'Insufficient permissions'}`,
          'fetching',
          context
        );

      case 429:
        const retryAfter = response.headers.get('Retry-After');
        const retryAfterSeconds = retryAfter ? parseInt(retryAfter) : 900; // Default 15 minutes
        
        throw new RateLimitError(
          `Rate limit exceeded. ${errorBody.message || 'Too many requests'}`,
          'fetching',
          retryAfterSeconds
        );

      case 404:
        throw new Error(`Resource not found: ${endpoint}`);

      case 500:
      case 502:
      case 503:
      case 504:
        throw new NetworkError(
          `Strava server error: ${status} ${response.statusText}`,
          'fetching',
          context
        );

      default:
        throw new NetworkError(
          `HTTP ${status}: ${errorBody.message || response.statusText}`,
          'fetching',
          context
        );
    }
  }

  // Update rate limit state from response headers
  private updateRateLimitState(response: Response): void {
    const dailyUsage = response.headers.get('X-RateLimit-Usage');
    const dailyLimit = response.headers.get('X-RateLimit-Limit');
    
    if (dailyUsage && dailyLimit) {
      const [shortTerm, daily] = dailyUsage.split(',').map(Number);
      const [shortTermLimit, dailyLimitNum] = dailyLimit.split(',').map(Number);
      
      this.rateLimitState = {
        dailyUsage: daily,
        dailyLimit: dailyLimitNum,
        shortTermUsage: shortTerm,
        shortTermLimit: shortTermLimit,
        resetTime: Date.now() + (15 * 60 * 1000) // Reset in 15 minutes
      };

      console.log(`[StravaClient] Rate limit state: ${shortTerm}/${shortTermLimit} (15min), ${daily}/${dailyLimitNum} (daily)`);
    }
  }

  // Check if we're approaching rate limits
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset counters if time has passed
    if (now > this.rateLimitState.resetTime) {
      this.rateLimitState.shortTermUsage = 0;
      this.rateLimitState.resetTime = now + (15 * 60 * 1000);
    }

    // Check short-term limit (15 minutes)
    const shortTermUsagePercent = this.rateLimitState.shortTermUsage / this.rateLimitState.shortTermLimit;
    if (shortTermUsagePercent > 0.8) {
      const waitTime = Math.min(
        (this.rateLimitState.resetTime - now) / 1000,
        300 // Max 5 minutes
      );
      
      console.warn(`[StravaClient] Approaching short-term rate limit (${Math.round(shortTermUsagePercent * 100)}%), waiting ${waitTime}s`);
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    }

    // Check daily limit
    const dailyUsagePercent = this.rateLimitState.dailyUsage / this.rateLimitState.dailyLimit;
    if (dailyUsagePercent > 0.9) {
      throw new RateLimitError(
        `Approaching daily rate limit (${Math.round(dailyUsagePercent * 100)}%)`,
        'fetching',
        86400 // Wait 24 hours
      );
    }
  }

  // Get athlete activities with pagination
  async getActivities(
    userId: string,
    params: PaginationParams = { page: 1, per_page: 50 }
  ): Promise<PaginationResponse<StravaActivity>> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', params.page.toString());
    queryParams.append('per_page', Math.min(params.per_page, 200).toString()); // Strava max is 200

    if (params.after) {
      queryParams.append('after', params.after.toString());
    }
    if (params.before) {
      queryParams.append('before', params.before.toString());
    }

    const endpoint = `/athlete/activities?${queryParams.toString()}`;
    
    console.log(`[StravaClient] Fetching activities: page ${params.page}, per_page ${params.per_page}`);
    
    const activities = await withRetry(
      () => this.makeRequest<any[]>(endpoint, userId),
      'fetching',
      {
        ...DEFAULT_RETRY_OPTIONS,
        maxRetries: this.options.maxRetries,
        baseDelay: this.options.baseDelay,
        maxDelay: this.options.maxDelay
      }
    );

    // Filter for running activities only
    const runningActivities = activities.filter(activity => activity.type === 'Run');
    
    console.log(`[StravaClient] Filtered ${runningActivities.length} runs from ${activities.length} total activities`);

    // Validate and transform activities
    const validatedActivities: StravaActivity[] = [];
    const duplicatesSkipped: number[] = [];
    const seenIds = new Set<number>();

    for (const activity of runningActivities) {
      try {
        // Check for duplicates
        if (seenIds.has(activity.id)) {
          duplicatesSkipped.push(activity.id);
          continue;
        }
        seenIds.add(activity.id);

        // Validate activity data
        const validatedActivity = validateStravaActivity(activity);
        validatedActivities.push(validatedActivity);
      } catch (error) {
        console.warn(`[StravaClient] Skipping invalid activity ${activity.id}:`, error);
      }
    }

    return {
      data: validatedActivities,
      pagination: {
        current_page: params.page,
        has_more: activities.length === params.per_page, // If we got a full page, there might be more
        next_page: activities.length === params.per_page ? params.page + 1 : undefined,
        total_estimated: undefined // Strava doesn't provide total count
      },
      metadata: {
        total_fetched: activities.length,
        filtered_count: runningActivities.length,
        duplicates_skipped: duplicatesSkipped.length
      }
    };
  }

  // Get detailed activity information
  async getActivity(userId: string, activityId: number): Promise<StravaActivity> {
    const endpoint = `/activities/${activityId}`;
    
    console.log(`[StravaClient] Fetching detailed activity: ${activityId}`);
    
    const activity = await withRetry(
      () => this.makeRequest<any>(endpoint, userId),
      'fetching',
      {
        ...DEFAULT_RETRY_OPTIONS,
        maxRetries: this.options.maxRetries,
        baseDelay: this.options.baseDelay,
        maxDelay: this.options.maxDelay
      }
    );

    return validateStravaActivity(activity);
  }

  // Get athlete information
  async getAthlete(userId: string): Promise<any> {
    const endpoint = '/athlete';
    
    console.log(`[StravaClient] Fetching athlete information`);
    
    return await withRetry(
      () => this.makeRequest<any>(endpoint, userId),
      'fetching',
      {
        ...DEFAULT_RETRY_OPTIONS,
        maxRetries: this.options.maxRetries,
        baseDelay: this.options.baseDelay,
        maxDelay: this.options.maxDelay
      }
    );
  }

  // Batch fetch activities with automatic pagination
  async getAllActivities(
    userId: string,
    options: {
      after?: number;
      before?: number;
      maxPages?: number;
      perPage?: number;
      onProgress?: (page: number, activities: StravaActivity[]) => void;
    } = {}
  ): Promise<StravaActivity[]> {
    const {
      after,
      before,
      maxPages = 50, // Reasonable default to prevent infinite loops
      perPage = 100,
      onProgress
    } = options;

    const allActivities: StravaActivity[] = [];
    let currentPage = 1;
    let hasMore = true;

    console.log(`[StravaClient] Starting batch fetch: maxPages=${maxPages}, perPage=${perPage}`);

    while (hasMore && currentPage <= maxPages) {
      try {
        const response = await this.getActivities(userId, {
          page: currentPage,
          per_page: perPage,
          after,
          before
        });

        allActivities.push(...response.data);
        
        if (onProgress) {
          onProgress(currentPage, response.data);
        }

        hasMore = response.pagination.has_more;
        currentPage++;

        console.log(`[StravaClient] Fetched page ${currentPage - 1}: ${response.data.length} activities (total: ${allActivities.length})`);

        // Add small delay between requests to be respectful
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.error(`[StravaClient] Error fetching page ${currentPage}:`, error);
        
        // If it's a rate limit error, we should stop
        if (error instanceof RateLimitError) {
          console.warn(`[StravaClient] Rate limit hit at page ${currentPage}, stopping batch fetch`);
          break;
        }
        
        // For other errors, we might want to continue or stop based on error type
        if (error instanceof AuthenticationError) {
          throw error; // Authentication errors should bubble up
        }
        
        // For network errors, we can try to continue
        console.warn(`[StravaClient] Network error at page ${currentPage}, continuing...`);
        currentPage++;
      }
    }

    console.log(`[StravaClient] Batch fetch completed: ${allActivities.length} total activities`);
    return allActivities;
  }

  // Get current rate limit status
  getRateLimitStatus(): {
    shortTerm: { usage: number; limit: number; percentage: number };
    daily: { usage: number; limit: number; percentage: number };
    resetTime: string;
  } {
    return {
      shortTerm: {
        usage: this.rateLimitState.shortTermUsage,
        limit: this.rateLimitState.shortTermLimit,
        percentage: Math.round((this.rateLimitState.shortTermUsage / this.rateLimitState.shortTermLimit) * 100)
      },
      daily: {
        usage: this.rateLimitState.dailyUsage,
        limit: this.rateLimitState.dailyLimit,
        percentage: Math.round((this.rateLimitState.dailyUsage / this.rateLimitState.dailyLimit) * 100)
      },
      resetTime: new Date(this.rateLimitState.resetTime).toISOString()
    };
  }

  // Get circuit breaker status
  getCircuitBreakerStatus(): { state: string; failures: number; lastFailureTime: number } {
    return this.circuitBreaker.getState();
  }

  // Reset circuit breaker (for testing or manual recovery)
  resetCircuitBreaker(): void {
    // Create new circuit breaker to reset state
    Object.assign(this.circuitBreaker, new CircuitBreaker(5, 60000));
  }
}

// Export singleton instance
export const stravaClient = new StravaClient();