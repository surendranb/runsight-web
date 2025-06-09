// Secure App Component - Zero credential exposure
// Uses Netlify Functions for all sensitive operations

import React from 'react';
import { useSecureAuth } from './hooks/useSecureAuth';
import SecureStravaCallback from './components/SecureStravaCallback';
import SecureDashboard from './components/SecureDashboard';

const SecureApp: React.FC = () => {
  const { user, isLoading, error, initiateStravaAuth, clearError } = useSecureAuth();

  // Handle OAuth callback (support both /callback and /auth/callback)
  if (window.location.pathname === '/auth/callback' || window.location.pathname === '/callback') {
    return <SecureStravaCallback />;
  }

  // Loading state
  if (isLoading) {
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
          textAlign: 'center',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <h2 style={{ color: '#1f2937', margin: 0 }}>Loading...</h2>
        </div>
      </div>
    );
  }

  // Authenticated user - show dashboard
  if (user) {
    return <SecureDashboard />;
  }

  // Unauthenticated - show landing page
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
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          fontSize: '64px',
          marginBottom: '24px'
        }}>
          🏃‍♂️
        </div>

        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#1f2937',
          marginBottom: '16px'
        }}>
          RunSight
        </h1>

        <p style={{
          color: '#6b7280',
          marginBottom: '32px',
          fontSize: '18px',
          lineHeight: '1.6'
        }}>
          Discover insights from your running data with weather context. 
          Connect your Strava account to get started.
        </p>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{
              color: '#dc2626',
              fontSize: '14px',
              margin: 0
            }}>
              ❌ {error}
            </p>
            <button
              onClick={clearError}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#dc2626',
                fontSize: '12px',
                cursor: 'pointer',
                marginTop: '8px',
                textDecoration: 'underline'
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        <button
          onClick={initiateStravaAuth}
          style={{
            background: '#fc4c02',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '16px 32px',
            fontSize: '18px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            width: '100%',
            marginBottom: '24px'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#e03e00';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#fc4c02';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span style={{ fontSize: '24px' }}>🔗</span>
          Connect with Strava
        </button>

        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <h3 style={{
            color: '#166534',
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 8px 0'
          }}>
            🔒 Secure by Design
          </h3>
          <p style={{
            color: '#166534',
            fontSize: '14px',
            margin: 0,
            lineHeight: '1.5'
          }}>
            Your credentials and data are processed securely on our servers. 
            No sensitive information is exposed to your browser.
          </p>
        </div>

        <div style={{
          background: '#f9fafb',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <h3 style={{
            color: '#1f2937',
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 12px 0'
          }}>
            What you'll get:
          </h3>
          <ul style={{
            color: '#6b7280',
            fontSize: '14px',
            textAlign: 'left',
            margin: 0,
            paddingLeft: '20px'
          }}>
            <li>🏃‍♂️ Your recent running activities</li>
            <li>🌤️ Weather conditions during each run</li>
            <li>📊 Performance insights and statistics</li>
            <li>🔒 Complete data privacy and security</li>
          </ul>
        </div>

        <p style={{
          color: '#9ca3af',
          fontSize: '12px',
          marginTop: '24px',
          margin: 0
        }}>
          By connecting, you agree to share your Strava running data with RunSight for analysis.
        </p>
      </div>
    </div>
  );
};

export default SecureApp;