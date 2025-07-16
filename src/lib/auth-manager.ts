// Authentication and Token Management System for Strava integration

import { supabaseAdmin, handleDatabaseError, logDatabaseOperation } from './database';
import { AuthenticationError, NetworkError, classifyError } from './errors';

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
}

export interface StravaAthlete {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  city: string;
  state: string;
  country: string;
  sex: string;
  premium: boolean;
  profile_medium: string;
  profile: string;
}

export interface StravaAuthResponse {
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete: StravaAthlete;
}

export class AuthManager {
  private readonly stravaClientId: string;
  private readonly stravaClientSecret: string;
  private readonly stravaAuthUrl = 'https://www.strava.com/oauth/token';

  constructor() {
    this.stravaClientId = process.env.VITE_STRAVA_CLIENT_ID || process.env.STRAVA_CLIENT_ID || '';
    this.stravaClientSecret = process.env.VITE_STRAVA_CLIENT_SECRET || process.env.STRAVA_CLIENT_SECRET || '';

    if (!this.stravaClientId || !this.stravaClientSecret) {
      throw new Error('Missing Strava client credentials in environment variables');
    }
  }

  // Get user's current Strava tokens from Supabase
  async getUserTokens(userId: string): Promise<StravaTokens | null> {
    const startTime = Date.now();
    
    try {
      const { data: userAuthData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

      if (userError || !userAuthData || !userAuthData.user) {
        throw new AuthenticationError('User not found', 'fetching', { userId });
      }

      const user = userAuthData.user;
      const metadata = user.user_metadata;

      if (!metadata?.strava_access_token || !metadata?.strava_refresh_token) {
        const duration = Date.now() - startTime;
        logDatabaseOperation('getUserTokens', duration, 0);
        return null;
      }

      const tokens: StravaTokens = {
        access_token: metadata.strava_access_token,
        refresh_token: metadata.strava_refresh_token,
        expires_at: metadata.strava_expires_at || 0,
        scope: metadata.strava_scope || ''
      };

      const duration = Date.now() - startTime;
      logDatabaseOperation('getUserTokens', duration, 1);

      return tokens;
    } catch (error) {
      const duration = Date.now() - startTime;
      logDatabaseOperation('getUserTokens', duration, 0, error as Error);
      throw classifyError(error, 'fetching');
    }
  }

  // Update user's Strava tokens in Supabase
  async updateUserTokens(userId: string, tokens: StravaTokens): Promise<void> {
    const startTime = Date.now();
    
    try {
      const { data: userAuthData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

      if (getUserError || !userAuthData || !userAuthData.user) {
        throw new AuthenticationError('User not found for token update', 'storing', { userId });
      }

      const newMetadata = {
        ...userAuthData.user.user_metadata,
        strava_access_token: tokens.access_token,
        strava_refresh_token: tokens.refresh_token,
        strava_expires_at: tokens.expires_at,
        strava_scope: tokens.scope,
        strava_token_updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: newMetadata
      });

      if (updateError) {
        throw handleDatabaseError(updateError, 'updateUserTokens');
      }

      const duration = Date.now() - startTime;
      logDatabaseOperation('updateUserTokens', duration, 1);

    } catch (error) {
      const duration = Date.now() - startTime;
      logDatabaseOperation('updateUserTokens', duration, 0, error as Error);
      throw classifyError(error, 'storing');
    }
  }

  // Check if tokens need refresh (expire within 5 minutes)
  needsRefresh(tokens: StravaTokens): boolean {
    const fiveMinutesFromNow = Math.floor(Date.now() / 1000) + (5 * 60);
    return tokens.expires_at <= fiveMinutesFromNow;
  }

  // Refresh Strava access token
  async refreshStravaToken(refreshToken: string): Promise<StravaTokens> {
    try {
      const response = await fetch(this.stravaAuthUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.stravaClientId,
          client_secret: this.stravaClientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        
        if (response.status === 401 || response.status === 400) {
          throw new AuthenticationError(
            `Token refresh failed: ${errorBody.message || 'Invalid refresh token'}`,
            'fetching',
            { status: response.status, error: errorBody }
          );
        }

        if (response.status === 429) {
          throw new Error('Rate limit exceeded during token refresh');
        }

        throw new NetworkError(
          `HTTP ${response.status}: ${errorBody.message || 'Token refresh failed'}`,
          'fetching',
          { status: response.status, error: errorBody }
        );
      }

      const tokenData = await response.json();

      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || refreshToken, // Strava may not return new refresh token
        expires_at: tokenData.expires_at,
        scope: tokenData.scope || ''
      };

    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError(
        `Token refresh failed: ${(error as Error).message}`,
        'fetching',
        { original_error: (error as Error).name }
      );
    }
  }

  // Get valid access token (refresh if needed)
  async getValidAccessToken(userId: string): Promise<string> {
    const tokens = await this.getUserTokens(userId);
    
    if (!tokens) {
      throw new AuthenticationError(
        'No Strava tokens found for user. Please re-authenticate.',
        'fetching',
        { userId }
      );
    }

    // Check if token needs refresh
    if (this.needsRefresh(tokens)) {
      console.log(`[AuthManager] Refreshing expired token for user ${userId}`);
      
      try {
        const newTokens = await this.refreshStravaToken(tokens.refresh_token);
        await this.updateUserTokens(userId, newTokens);
        
        console.log(`[AuthManager] Successfully refreshed token for user ${userId}`);
        return newTokens.access_token;
      } catch (error) {
        console.error(`[AuthManager] Token refresh failed for user ${userId}:`, error);
        throw error;
      }
    }

    return tokens.access_token;
  }

  // Validate access token by making a test API call
  async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://www.strava.com/api/v3/athlete', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('[AuthManager] Token validation failed:', error);
      return false;
    }
  }

  // Exchange authorization code for tokens (OAuth flow)
  async exchangeCodeForTokens(code: string): Promise<StravaAuthResponse> {
    try {
      const response = await fetch(this.stravaAuthUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.stravaClientId,
          client_secret: this.stravaClientSecret,
          code: code,
          grant_type: 'authorization_code'
        })
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new AuthenticationError(
          `OAuth exchange failed: ${errorBody.message || 'Invalid authorization code'}`,
          'fetching',
          { status: response.status, error: errorBody }
        );
      }

      const authData = await response.json();
      
      // Validate response structure
      if (!authData.access_token || !authData.refresh_token || !authData.athlete) {
        throw new AuthenticationError(
          'Invalid OAuth response from Strava',
          'fetching',
          { response: authData }
        );
      }

      return authData as StravaAuthResponse;

    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new NetworkError(
        `OAuth exchange failed: ${(error as Error).message}`,
        'fetching',
        { original_error: (error as Error).name }
      );
    }
  }

  // Revoke Strava access (deauthorize)
  async revokeAccess(userId: string): Promise<void> {
    try {
      const tokens = await this.getUserTokens(userId);
      
      if (tokens) {
        // Call Strava's deauthorization endpoint
        try {
          await fetch('https://www.strava.com/oauth/deauthorize', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          // Log but don't fail - we'll clear local tokens anyway
          console.warn('[AuthManager] Failed to revoke token with Strava:', error);
        }
      }

      // Clear tokens from user metadata
      const { data: userAuthData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

      if (!getUserError && userAuthData?.user) {
        const newMetadata = { ...userAuthData.user.user_metadata };
        delete newMetadata.strava_access_token;
        delete newMetadata.strava_refresh_token;
        delete newMetadata.strava_expires_at;
        delete newMetadata.strava_scope;
        delete newMetadata.strava_token_updated_at;

        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: newMetadata
        });
      }

      console.log(`[AuthManager] Successfully revoked access for user ${userId}`);

    } catch (error) {
      console.error(`[AuthManager] Failed to revoke access for user ${userId}:`, error);
      throw classifyError(error, 'storing');
    }
  }

  // Get user's Strava athlete information
  async getAthleteInfo(userId: string): Promise<StravaAthlete | null> {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      
      const response = await fetch('https://www.strava.com/api/v3/athlete', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new AuthenticationError('Invalid or expired access token', 'fetching', { userId });
        }
        throw new NetworkError(`Failed to fetch athlete info: HTTP ${response.status}`, 'fetching');
      }

      const athleteData = await response.json();
      return athleteData as StravaAthlete;

    } catch (error) {
      console.error(`[AuthManager] Failed to get athlete info for user ${userId}:`, error);
      throw classifyError(error, 'fetching');
    }
  }

  // Check if user has required Strava scopes
  hasRequiredScopes(tokens: StravaTokens, requiredScopes: string[] = ['read', 'activity:read']): boolean {
    if (!tokens.scope) {
      return false;
    }

    const userScopes = tokens.scope.split(',').map(s => s.trim());
    return requiredScopes.every(scope => userScopes.includes(scope));
  }

  // Get authorization URL for Strava OAuth
  getAuthorizationUrl(redirectUri: string, state?: string): string {
    const params = new URLSearchParams({
      client_id: this.stravaClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'read,activity:read',
      approval_prompt: 'auto'
    });

    if (state) {
      params.append('state', state);
    }

    return `https://www.strava.com/oauth/authorize?${params.toString()}`;
  }

  // Middleware for authenticating API requests
  async authenticateRequest(userId: string): Promise<string> {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      
      // Validate token is still working
      const isValid = await this.validateAccessToken(accessToken);
      if (!isValid) {
        throw new AuthenticationError('Access token is no longer valid', 'fetching', { userId });
      }

      return accessToken;
    } catch (error) {
      console.error(`[AuthManager] Authentication failed for user ${userId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const authManager = new AuthManager();