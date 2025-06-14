// Secure Strava Callback Component - No credentials exposed
// Handles OAuth callback through Netlify Functions

import React, { useEffect, useState, useRef } from 'react';
import { useSecureAuth } from '../hooks/useSecureAuth';
// import { apiClient } from '../lib/secure-api-client'; // No longer needed here

interface CallbackState {
  step: 'authenticating' | 'redirecting' | 'error'; // Simplified steps
  message: string;
  progress: number; // Can be simplified or removed if steps are too few/fast
  error?: string;
}

const SecureStravaCallback: React.FC = () => {
  const { handleStravaCallback } = useSecureAuth(); // user not needed here anymore
  const [state, setState] = useState<CallbackState>({
    step: 'authenticating',
    message: 'Authenticating with Strava...',
    progress: 25 // Initial progress
  });
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    
    const processCallback = async () => {
      try {
        console.log('🔄 Starting callback processing...');
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        console.log('📋 URL params:', { code: code?.substring(0, 10) + '...', error });

        if (error) throw new Error(`Strava authorization failed: ${error}`);
        if (!code) throw new Error('No authorization code received from Strava');

        setState({ step: 'authenticating', message: 'Securely authenticating your Strava account...', progress: 50 });
        console.log('🔐 Calling handleStravaCallback...');
        await handleStravaCallback(code); // authenticatedUser not directly used here anymore
        console.log('✅ Authentication successful.');

        setState({ step: 'redirecting', message: 'Authentication successful! Redirecting to your dashboard...', progress: 100 });
        setTimeout(() => { window.location.href = '/'; }, 1500); // Shortened delay

      } catch (error) {
        console.error('Callback processing failed:', error);
        setState({
          step: 'error',
          message: 'Authentication failed. Please try again.', // Slightly more user-friendly
          progress: 0,
          error: error instanceof Error ? error.message : 'An unknown error occurred during authentication.'
        });
      }
    };

    processCallback();
  }, [handleStravaCallback]); // Added handleStravaCallback to dependencies

  const getStepIcon = () => {
    switch (state.step) {
      case 'authenticating':
        return '🔐';
      case 'redirecting':
        return '✅'; // Using success icon for redirecting state
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStepColor = () => {
    switch (state.step) {
      case 'redirecting': // Success color for redirecting
        return '#10b981';
      case 'error':
        return '#ef4444';
      default: // Default/authenticating color
        return '#3b82f6';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '500px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '20px'
        }}>
          {getStepIcon()}
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '16px'
        }}>
          {state.step === 'error' ? 'Authentication Failed' : 'Finalizing Authentication'}
        </h1>

        <p style={{
          color: '#6b7280',
          marginBottom: '32px',
          fontSize: '16px'
        }}>
          {state.message}
        </p>

        {/* Simplified or remove progress bar if deemed too quick */}
        {state.step !== 'error' && state.step !== 'redirecting' && (
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '24px'
          }}>
            <div style={{
              width: `${state.progress}%`,
              height: '100%',
              backgroundColor: getStepColor(),
              borderRadius: '4px',
              transition: 'width 0.3s ease-in-out' // Faster transition
            }} />
          </div>
        )}

        {state.step === 'redirecting' && (
           <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{
              color: '#166534',
              fontSize: '14px',
              margin: 0
            }}>
              You will be redirected shortly...
            </p>
          </div>
        )}

        {state.error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{
              color: '#dc2626', // Error text color
              fontSize: '14px',
              margin: 0,
              textAlign: 'left' // Align error details to the left for readability
            }}>
              <strong>Details:</strong> {state.error}
            </p>
          </div>
        )}

        {/* Removed the specific 'complete' state message block as 'redirecting' covers it */}

        {state.step === 'error' && (
          <button
            onClick={() => window.location.href = '/'}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            Try Again
          </button>
        )}

        <div style={{
          marginTop: '32px',
          padding: '16px',
          background: '#f9fafb',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          <p style={{ margin: 0 }}>
            🔒 <strong>Secure Processing:</strong> All your credentials and data are processed securely on our servers. 
            No sensitive information is exposed to your browser.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SecureStravaCallback;