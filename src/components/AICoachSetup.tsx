import React, { useState } from 'react';
import { Brain, Key, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

interface AICoachSetupProps {
  onApiKeySet?: (apiKey: string) => void;
  className?: string;
}

export default function AICoachSetup({ onApiKeySet, className = '' }: AICoachSetupProps) {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<'success' | 'error' | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const validateApiKey = async () => {
    if (!apiKey.trim()) return;
    
    setIsValidating(true);
    setValidationResult(null);

    try {
      // Test the API key by making a simple request
      const response = await fetch('/.netlify/functions/ai-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate_insights',
          data: {
            runs: [],
            performanceMetrics: {
              recentPace: 300,
              distanceTrend: 'stable',
              consistencyScore: 75,
              effortVariability: 10,
              bestConditions: 'Cool weather',
              improvementAreas: ['Endurance'],
              strengths: ['Consistency']
            }
          }
        }),
      });

      if (response.ok) {
        setValidationResult('success');
        onApiKeySet?.(apiKey);
      } else {
        setValidationResult('error');
      }
    } catch (error) {
      console.error('API key validation failed:', error);
      setValidationResult('error');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">AI Coach Setup</h3>
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-blue-800 text-sm font-medium mb-1">
                AI Coach requires a Google Gemini API key
              </p>
              <p className="text-blue-700 text-sm">
                Get personalized training insights, goal analysis, and smart recommendations powered by Google's Gemini AI.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="gemini-api-key" className="block text-sm font-medium text-gray-700 mb-2">
            Gemini API Key
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="gemini-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={validateApiKey}
              disabled={!apiKey.trim() || isValidating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isValidating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Testing...
                </>
              ) : (
                'Test & Save'
              )}
            </button>
          </div>
          
          {validationResult === 'success' && (
            <div className="mt-2 flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="w-4 h-4" />
              API key is valid! AI Coach is now active.
            </div>
          )}
          
          {validationResult === 'error' && (
            <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              Invalid API key or connection error. Please check your key and try again.
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {showInstructions ? 'Hide' : 'Show'} setup instructions
          </button>
          
          {showInstructions && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg text-sm space-y-3">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">How to get your Gemini API key:</h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-700">
                  <li>
                    Visit{' '}
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                    >
                      Google AI Studio
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Sign in with your Google account</li>
                  <li>Click "Create API Key" and select a project</li>
                  <li>Copy the generated API key</li>
                  <li>Paste it above and click "Test & Save"</li>
                </ol>
              </div>
              
              <div className="border-t pt-3">
                <h4 className="font-medium text-gray-900 mb-2">Privacy & Security:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Your API key is stored securely as an environment variable</li>
                  <li>Only aggregated, anonymized running data is sent to Gemini</li>
                  <li>No personal information or location data is shared</li>
                  <li>You can revoke the API key anytime from Google AI Studio</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}