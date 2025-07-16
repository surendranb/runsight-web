// Database utility functions for the robust data sync system
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Database connection configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_KEY environment variable');
}

// Create Supabase client with service key for server-side operations
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database transaction wrapper
export async function withTransaction<T>(
  operation: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  // Note: Supabase doesn't expose explicit transaction control in the client
  // For now, we'll use the client directly and rely on individual operation atomicity
  // In the future, we could implement this with stored procedures or RPC calls
  return await operation(supabaseAdmin);
}

// Connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('sync_sessions')
      .select('id')
      .limit(1);
    
    return !error;
  } catch (err) {
    console.error('Database connection check failed:', err);
    return false;
  }
}

// Utility function to handle database errors consistently
export function handleDatabaseError(error: any, context: string): Error {
  console.error(`Database error in ${context}:`, error);
  
  // Map common Supabase errors to user-friendly messages
  if (error?.code === 'PGRST116') {
    return new Error('No data found');
  }
  
  if (error?.code === '23505') {
    return new Error('Duplicate data detected');
  }
  
  if (error?.code === '23503') {
    return new Error('Referenced data not found');
  }
  
  if (error?.message?.includes('JWT')) {
    return new Error('Authentication required');
  }
  
  if (error?.message?.includes('RLS')) {
    return new Error('Access denied');
  }
  
  return new Error(error?.message || 'Database operation failed');
}

// Retry wrapper for database operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on authentication or permission errors
      if (error instanceof Error && 
          (error.message.includes('JWT') || 
           error.message.includes('RLS') ||
           error.message.includes('Authentication'))) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Batch operation helper
export async function batchOperation<T, R>(
  items: T[],
  operation: (batch: T[]) => Promise<R[]>,
  batchSize: number = 100
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await operation(batch);
    results.push(...batchResults);
  }
  
  return results;
}

// Database logging utility
export function logDatabaseOperation(
  operation: string,
  duration: number,
  recordCount?: number,
  error?: Error
): void {
  const logData = {
    operation,
    duration_ms: duration,
    record_count: recordCount,
    success: !error,
    error_message: error?.message,
    timestamp: new Date().toISOString()
  };
  
  if (error) {
    console.error('Database operation failed:', logData);
  } else {
    console.log('Database operation completed:', logData);
  }
}