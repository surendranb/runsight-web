// Secure Dashboard Component - No credentials exposed
// Fetches data through Netlify Functions

import React, { useEffect, useState } from 'react';
import { useSecureAuth } from '../hooks/useSecureAuth';
import { apiClient, type Run, type RunStats } from '../lib/secure-api-client';

interface DashboardState {
  runs: Run[];
  stats: RunStats | null;
  isLoading: boolean;
  error: string | null;
  isSyncing: boolean;
}

const SecureDashboard: React.FC = () => {
  const { user, logout } = useSecureAuth();
  const [state, setState] = useState<DashboardState>({
    runs: [],
    stats: null,
    isLoading: true,
    error: null,
    isSyncing: false
  });

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { runs, stats } = await apiClient.getUserRuns(user.id);
      
      setState(prev => ({
        ...prev,
        runs,
        stats,
        isLoading: false
      }));

    } catch (error) {
      console.error('Failed to load user data:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load data'
      }));
    }
  };

  const syncNewData = async () => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, isSyncing: true, error: null }));
      
      const result = await apiClient.syncUserData(user.id, 7);
      
      // Reload data after sync
      await loadUserData();
      
      setState(prev => ({ ...prev, isSyncing: false }));
      
      alert(`Sync complete! Added ${result.savedCount} new runs.`);

    } catch (error) {
      console.error('Sync failed:', error);
      setState(prev => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      }));
    }
  };

  const formatDistance = (meters: number) => {
    return (meters / 1000).toFixed(2) + ' km';
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatPace = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')} /km`;
  };

  if (!user) {
    return <div>Please authenticate first</div>;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0,
              marginBottom: '8px'
            }}>
              Welcome back, {user.name}! 🏃‍♂️
            </h1>
            <p style={{
              color: '#6b7280',
              margin: 0,
              fontSize: '16px'
            }}>
              Your running insights powered by secure data processing
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={syncNewData}
              disabled={state.isSyncing}
              style={{
                background: state.isSyncing ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: state.isSyncing ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {state.isSyncing ? '🔄 Syncing...' : '🔄 Sync New Data'}
            </button>
            
            <button
              onClick={logout}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Error Display */}
        {state.error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{
              color: '#dc2626',
              margin: 0,
              fontSize: '14px'
            }}>
              ❌ {state.error}
            </p>
          </div>
        )}

        {/* Loading State */}
        {state.isLoading && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔄</div>
            <p style={{ color: '#6b7280', margin: 0 }}>Loading your running data...</p>
          </div>
        )}

        {/* Stats Cards */}
        {state.stats && !state.isLoading && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '24px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ color: '#1f2937', margin: '0 0 8px 0', fontSize: '16px' }}>Total Runs</h3>
              <p style={{ color: '#3b82f6', margin: 0, fontSize: '32px', fontWeight: '700' }}>
                {state.stats.total_runs}
              </p>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ color: '#1f2937', margin: '0 0 8px 0', fontSize: '16px' }}>Total Distance</h3>
              <p style={{ color: '#10b981', margin: 0, fontSize: '32px', fontWeight: '700' }}>
                {formatDistance(state.stats.total_distance)}
              </p>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ color: '#1f2937', margin: '0 0 8px 0', fontSize: '16px' }}>Total Time</h3>
              <p style={{ color: '#f59e0b', margin: 0, fontSize: '32px', fontWeight: '700' }}>
                {formatTime(state.stats.total_time)}
              </p>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ color: '#1f2937', margin: '0 0 8px 0', fontSize: '16px' }}>Average Pace</h3>
              <p style={{ color: '#8b5cf6', margin: 0, fontSize: '32px', fontWeight: '700' }}>
                {formatPace(state.stats.average_pace)}
              </p>
            </div>
          </div>
        )}

        {/* Recent Runs */}
        {!state.isLoading && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0 0 20px 0'
            }}>
              Recent Runs ({state.runs.length})
            </h2>

            {state.runs.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#6b7280'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏃‍♂️</div>
                <p style={{ margin: 0, fontSize: '16px' }}>
                  No runs found. Click "Sync New Data" to import your Strava activities.
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gap: '16px'
              }}>
                {state.runs.slice(0, 10).map((run) => (
                  <div
                    key={run.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                  >
                    <div>
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1f2937',
                        margin: '0 0 8px 0'
                      }}>
                        {run.name}
                      </h3>
                      <div style={{
                        display: 'flex',
                        gap: '16px',
                        fontSize: '14px',
                        color: '#6b7280'
                      }}>
                        <span>📏 {formatDistance(run.distance)}</span>
                        <span>⏱️ {formatTime(run.moving_time)}</span>
                        {run.weather_data?.temperature && (
                          <span>🌡️ {Math.round(run.weather_data.temperature)}°C</span>
                        )}
                        {run.weather_data?.weather?.description && (
                          <span>🌤️ {run.weather_data.weather.description}</span>
                        )}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      textAlign: 'right'
                    }}>
                      {new Date(run.start_date_local).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Security Notice */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          marginTop: '24px',
          textAlign: 'center'
        }}>
          <p style={{
            color: 'white',
            margin: 0,
            fontSize: '14px',
            opacity: 0.9
          }}>
            🔒 <strong>Secure Architecture:</strong> All your credentials and sensitive data are processed securely on our servers. 
            No API keys or database credentials are exposed to your browser.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SecureDashboard;