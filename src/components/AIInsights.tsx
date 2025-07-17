import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, Target, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';
import { Run, Goal } from '../types';
import { aiCoachClient, TrainingInsight, GoalAnalysis, ProgressAssessment } from '../lib/ai-coach-client';
import AICoachSetup from './AICoachSetup';

interface AIInsightsProps {
  runs: Run[];
  goals: Goal[];
  className?: string;
}

export default function AIInsights({ runs, goals, className = '' }: AIInsightsProps) {
  const [insights, setInsights] = useState<TrainingInsight[]>([]);
  const [goalAnalyses, setGoalAnalyses] = useState<GoalAnalysis[]>([]);
  const [progressAssessments, setProgressAssessments] = useState<ProgressAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'insights' | 'goals' | 'progress'>('insights');
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    if (runs.length > 0) {
      loadAIInsights();
    }
  }, [runs, goals]);

  const loadAIInsights = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load insights and goal analysis in parallel
      const [insightsResult, goalAnalysisResult, progressResult] = await Promise.allSettled([
        aiCoachClient.generateInsights(runs, goals),
        goals.length > 0 ? aiCoachClient.analyzeGoals(runs, goals) : Promise.resolve([]),
        goals.length > 0 ? aiCoachClient.assessProgress(goals, runs) : Promise.resolve([])
      ]);

      if (insightsResult.status === 'fulfilled') {
        setInsights(insightsResult.value);
      }

      if (goalAnalysisResult.status === 'fulfilled') {
        setGoalAnalyses(goalAnalysisResult.value);
      }

      if (progressResult.status === 'fulfilled') {
        setProgressAssessments(progressResult.value);
      }

      // Check if any requests failed
      const failures = [insightsResult, goalAnalysisResult, progressResult]
        .filter(result => result.status === 'rejected');
      
      if (failures.length > 0) {
        console.warn('Some AI requests failed:', failures);
        setError('Some AI features may not be available. Please try again later.');
      }

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
          <button
            onClick={loadAIInsights}
            disabled={isLoading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => setActiveTab('insights')}
            className={`pb-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'insights'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Training Insights
          </button>
          {goals.length > 0 && (
            <>
              <button
                onClick={() => setActiveTab('goals')}
                className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'goals'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Goal Analysis
              </button>
              <button
                onClick={() => setActiveTab('progress')}
                className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'progress'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Progress Check
              </button>
            </>
          )}
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
          <>
            {/* Training Insights Tab */}
            {activeTab === 'insights' && (
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

            {/* Goal Analysis Tab */}
            {activeTab === 'goals' && (
              <div className="space-y-4">
                {goalAnalyses.length === 0 ? (
                  <p className="text-gray-600">No goal analysis available. Create some goals to get AI recommendations!</p>
                ) : (
                  goalAnalyses.map((analysis, index) => {
                    const goal = goals[index];
                    return (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{goal?.type} Goal</h4>
                            <p className="text-sm text-gray-600">
                              Target: {goal?.target} {goal?.type === 'pace' ? 'min/km' : goal?.type === 'distance' ? 'km' : 'runs/week'}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getFeasibilityColor(analysis.feasibility)}`}>
                            {analysis.feasibility.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-1">Success Probability</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${analysis.successProbability}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{analysis.successProbability}%</span>
                            </div>
                          </div>

                          {analysis.recommendations && analysis.recommendations.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-1">Recommendations</p>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {analysis.recommendations.map((rec, recIndex) => (
                                  <li key={recIndex} className="flex items-start gap-1">
                                    <TrendingUp className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {analysis.milestones && analysis.milestones.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-1">Key Milestones</p>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {analysis.milestones.map((milestone, milestoneIndex) => (
                                  <li key={milestoneIndex} className="flex items-start gap-1">
                                    <Target className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                                    <span>{milestone}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Progress Assessment Tab */}
            {activeTab === 'progress' && (
              <div className="space-y-4">
                {progressAssessments.length === 0 ? (
                  <p className="text-gray-600">No progress assessment available yet. Keep training to get progress updates!</p>
                ) : (
                  progressAssessments.map((assessment, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Progress Assessment</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(assessment.status)}`}>
                          {assessment.status.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-gray-600 text-sm mb-4">{assessment.message}</p>

                      {assessment.adjustments && assessment.adjustments.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-gray-700 mb-2">Recommended Adjustments</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {assessment.adjustments.map((adjustment, adjIndex) => (
                              <li key={adjIndex} className="flex items-start gap-1">
                                <span className="text-orange-600 mt-1">•</span>
                                <span>{adjustment}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {assessment.nextSteps && assessment.nextSteps.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-2">Next Steps</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {assessment.nextSteps.map((step, stepIndex) => (
                              <li key={stepIndex} className="flex items-start gap-1">
                                <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {assessment.motivationalMessage && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-blue-700 text-sm font-medium">{assessment.motivationalMessage}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
            </>
          )}
        </>
        )}
      </div>
    </div>
  );
}