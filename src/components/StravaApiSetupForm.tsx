// src/components/StravaApiSetupForm.tsx
import React, { useState, FormEvent, useCallback } from 'react'; // Added useCallback
import { apiClient } from '../lib/secure-api-client'; // Adjust path as needed
import { useSecureAuth } from '../hooks/useSecureAuth'; // To get Supabase session/token

interface StravaApiSetupFormProps {
  onSetupComplete: () => void; // Callback when setup is successful
}

const StravaApiSetupForm: React.FC<StravaApiSetupFormProps> = ({ onSetupComplete }) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Use the hook to get access to getAccessToken
  const { getAccessToken } = useSecureAuth();

  const handleSubmit = useCallback(async (e: FormEvent) => { // Wrapped in useCallback
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!clientId.trim() || !clientSecret.trim()) {
      setError('Both Client ID and Client Secret are required.');
      return;
    }

    if (!getAccessToken) {
        setError('Authentication context not available. Cannot retrieve access token.');
        return;
    }

    setIsLoading(true);
    try {
      const supabaseToken = await getAccessToken(); // Get token using the function from the hook
      if (!supabaseToken) {
        setError('Authentication error: User token not found. Please ensure you are logged in.');
        setIsLoading(false);
        return;
      }

      const result = await apiClient.saveStravaCredentials(clientId, clientSecret, supabaseToken);
      if (result.success) {
        setSuccessMessage(result.message || 'Credentials saved successfully!');
        setClientId('');
        setClientSecret('');
        if (onSetupComplete) {
          onSetupComplete();
        }
      } else {
        setError(result.message || 'An unknown error occurred.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [clientId, clientSecret, getAccessToken, onSetupComplete]); // Added dependencies

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-700 mb-6">Strava API Setup</h2>
      {/* ... other JSX ... */}
      <form onSubmit={handleSubmit}>
        {/* ... form elements ... */}
        <div className="mb-4">
          <label htmlFor="clientId" className="block text-gray-700 text-sm font-bold mb-2">
            Strava Client ID
          </label>
          <input
            type="text"
            id="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Your Strava Client ID"
            required
          />
        </div>
        <div className="mb-6">
          <label htmlFor="clientSecret" className="block text-gray-700 text-sm font-bold mb-2">
            Strava Client Secret
          </label>
          <input
            type="password" // Use password type for secrets
            id="clientSecret"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Your Strava Client Secret"
            required
          />
        </div>
        {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
        {successMessage && <p className="text-green-500 text-xs italic mb-4">{successMessage}</p>}
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Credentials'}
          </button>
        </div>
      </form>
      <p className="text-xs text-gray-500 mt-6">
        These credentials will be stored securely and used to fetch your Strava activities.
        They are only required for the initial setup or if you change your Strava application.
      </p>
    </div>
  );
};

export default StravaApiSetupForm;
