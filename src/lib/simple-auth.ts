import { supabase } from './supabase';
import { StravaAuthResponse } from '../types';

export interface SimpleUser {
  id: string;
  email: string;
  strava_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export const authenticateWithStrava = async (authResponse: StravaAuthResponse): Promise<SimpleUser> => {
  const { athlete, access_token, refresh_token, expires_at } = authResponse;
  
  console.log('🔐 Starting Strava authentication for athlete:', athlete.id);
  
  const email = `${athlete.id}@strava.local`;
  const password = `strava_${athlete.id}_secure`;
  
  try {
    // Try to sign up first (will fail if user exists)
    console.log('📝 Attempting to create new user...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          strava_id: athlete.id,
          first_name: athlete.firstname,
          last_name: athlete.lastname,
          profile_medium: athlete.profile_medium,
          strava_access_token: access_token,
          strava_refresh_token: refresh_token,
          strava_expires_at: expires_at,
        }
      }
    });

    if (signUpError) {
      if (signUpError.message.includes('User already registered')) {
        console.log('👤 User exists, signing in...');
        
        // User exists, sign them in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          console.error('❌ Sign in failed:', signInError);
          throw new Error(`Failed to sign in: ${signInError.message}`);
        }

        // Update user metadata with latest tokens
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            strava_access_token: access_token,
            strava_refresh_token: refresh_token,
            strava_expires_at: expires_at,
          }
        });

        if (updateError) {
          console.warn('⚠️ Failed to update user metadata:', updateError);
        }

        console.log('✅ User signed in successfully');
        return {
          id: signInData.user!.id,
          email,
          strava_id: athlete.id,
          access_token,
          refresh_token,
          expires_at,
        };
      } else {
        console.error('❌ Sign up failed:', signUpError);
        throw new Error(`Failed to create user: ${signUpError.message}`);
      }
    }

    // New user created successfully
    console.log('✅ New user created successfully');
    return {
      id: signUpData.user!.id,
      email,
      strava_id: athlete.id,
      access_token,
      refresh_token,
      expires_at,
    };

  } catch (error) {
    console.error('💥 Authentication failed:', error);
    throw error;
  }
};

export const getCurrentUser = async (): Promise<SimpleUser | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    const metadata = user.user_metadata;
    
    return {
      id: user.id,
      email: user.email!,
      strava_id: metadata.strava_id,
      access_token: metadata.strava_access_token,
      refresh_token: metadata.strava_refresh_token,
      expires_at: metadata.strava_expires_at,
    };
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Failed to sign out:', error);
    throw error;
  }
};