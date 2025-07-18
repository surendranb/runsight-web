import React, { useState } from 'react';
import { Brain, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';
import { Run } from '../types';
import { aiCoachClient, TrainingInsight } from '../lib/ai-coach-client';
import AICoachSetup from './AICoachSetup';

interface AIInsightsProps {
  runs: Run[];
  className?: string;
}

export default function AIInsights({ runs, className = '' }: AIInsightsProps) {
  const [insights, setInsights] = useState<TrainingInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number>(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Cache duration: 10 minutes (600,000 ms)
  const CACHE_DURATION = 10 * 60 * 1000;

  // Remove automatic loading - AI insights only load on manual refresh
  // useEffect removed to prevent automatic API calls

  const loadAIInsights = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load only training insights
      const insights = await aiCoachClient.generateInsights(runs, []);
      setInsights(insights);

      // Update cache tracking
      setLastAnalysisTime(Date.now());
      setHasLoadedOnce(true);

    } catch (err: any) {
      console.error('Failed to load AI insights:', err);
      
      // Check if error is due to missing API key
      if (err.message?.includes('CONFIG_ERROR') || err.message?.includes('API key')) {
        setNeedsSetup(true);
        setError('AI Coach requires setup. Please configure your Gemini API key below.');
      } else {
        setError('Failed to load AI insights. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Zap className="w-4 h-4 text-blue-500" />;
    }
  };

  const getFeasibilityColor = (feasibility: string) => {
    switch (feasibility) {
      case 'realistic': return 'text-green-600 bg-green-50';
      case 'challenging': return 'text-yellow-600 bg-yellow-50';
      case 'too_ambitious': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'text-green-600 bg-green-50';
      case 'ahead': return 'text-blue-600 bg-blue-50';
      case 'behind': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (runs.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">AI Coach</h3>
        </div>
        <p className="text-gray-600">Start running to get personalized AI insights and recommendations!</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">AI Coach</h3>
          </div>
          <div className="flex items-center gap-2">
            {hasLoadedOnce && (
              <span className="text-xs text-gray-500">
                Last updated: {Math.round((Date.now() - lastAnalysisTime) / 60000)}m ago
              </span>
            )}
            <button
              onClick={loadAIInsights}
              disabled={isLoading || (hasLoadedOnce && (Date.now() - lastAnalysisTime < CACHE_DURATION))}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 
               hasLoadedOnce && (Date.now() - lastAnalysisTime < CACHE_DURATION) ? 
               `Refresh (${Math.ceil((CACHE_DURATION - (Date.now() - lastAnalysisTime)) / 60000)}m)` : 
               'Refresh'}
            </button>
          </div>
        </div>

        {/* Simple header - no tabs needed */}
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700">Training Insights</h4>
        </div>
      </div>

      <div className="p-6">
        {needsSetup ? (
          <AICoachSetup 
            onApiKeySet={(apiKey) => {
              setNeedsSetup(false);
              setError(null);
              // Retry loading insights after API key is set
              loadAIInsights();
            }}
          />
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Analyzing your data...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {insights.length === 0 ? (
                  <p className="text-gray-600">No insights available yet. Try refreshing or add more running data.</p>
                ) : (
                  insights.map((insight, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        {getPriorityIcon(insight.priority)}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">{insight.title}</h4>
                          <p className="text-gray-600 text-sm mb-3">{insight.description}</p>
                          {insight.actionSteps && insight.actionSteps.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-1">Action Steps:</p>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {insight.actionSteps.map((step, stepIndex) => (
                                  <li key={stepIndex} className="flex items-start gap-1">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          insight.priority === 'high' ? 'bg-red-100 text-red-700' :
                          insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {insight.priority}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
        </>
        )}
      </div>
    </div>
  );
}