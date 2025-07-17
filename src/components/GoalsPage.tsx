import React, { useState, useEffect } from 'react';
import { Target, Plus, Calendar, TrendingUp, Award, Edit, Trash2, CheckCircle, Star, Clock, Zap } from 'lucide-react';
import { User, EnrichedRun } from '../types';
import { Goal, GoalProgress as GoalProgressType, CreateGoalRequest } from '../lib/goals/goalTypes';
import { calculateGoalProgress, getGoalStatusColor } from '../lib/goals/goalUtils';
import { GoalTemplate, getPopularTemplates, getTemplatesByCategory, templateToGoalRequest } from '../lib/goals/goalTemplates';
import AIInsights from './AIInsights';

interface GoalsPageProps {
  user: User;
  runs: EnrichedRun[];
  isLoading: boolean;
  error: string | null;
}

// No mock goals - start with empty array

export const GoalsPage: React.FC<GoalsPageProps> = ({ user, runs, isLoading, error }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalProgress, setGoalProgress] = useState<Map<string, GoalProgressType>>(new Map());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  useEffect(() => {
    // Calculate progress for each goal
    const progressMap = new Map<string, GoalProgressType>();
    goals.forEach(goal => {
      const progress = calculateGoalProgress(goal, runs);
      progressMap.set(goal.id, progress);
    });
    setGoalProgress(progressMap);
  }, [goals, runs]);

  const handleCreateGoal = (goalData: CreateGoalRequest) => {
    const newGoal: Goal = {
      id: Date.now().toString(),
      userId: user.id,
      type: goalData.type,
      title: goalData.title,
      description: goalData.description || '',
      targetValue: goalData.targetValue,
      currentValue: 0,
      unit: goalData.unit,
      targetDate: goalData.targetDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      priority: goalData.priority || 'medium',
      category: goalData.category || 'annual'
    };

    setGoals(prev => [...prev, newGoal]);
    setShowCreateModal(false);
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoals(prev => prev.filter(g => g.id !== goalId));
  };

  const formatValue = (value: number, unit: string): string => {
    switch (unit) {
      case 'meters':
        return `${(value / 1000).toFixed(1)}km`;
      case 'runs/week':
        return `${value.toFixed(1)} runs/week`;
      case 'seconds':
        const minutes = Math.floor(value / 60);
        const seconds = Math.floor(value % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      default:
        return value.toString();
    }
  };

  const getProgressColor = (percentage: number, isOnTrack: boolean): string => {
    if (percentage >= 100) return 'bg-green-500';
    if (isOnTrack) return 'bg-blue-500';
    return 'bg-orange-500';
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading Goals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
        <div className="bg-red-100 p-4 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold text-red-700 mb-2">Error Loading Goals</h2>
          <p className="text-red-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 mb-1 flex items-center">
              <Target className="w-6 h-6 text-blue-500 mr-2" />
              Goals & Progress
            </h1>
            <p className="text-gray-600">Set and track your running goals to stay motivated and measure progress.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Goal
          </button>
        </div>
      </div>

      {/* Goals Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full mr-4">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Goals</p>
              <p className="text-2xl font-bold text-gray-900">{goals.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full mr-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">On Track</p>
              <p className="text-2xl font-bold text-gray-900">
                {goals.filter(g => goalProgress.get(g.id)?.isOnTrack).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full mr-4">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {goals.filter(g => g.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full mr-4">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Avg Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {goals.length > 0 ? Math.round(Array.from(goalProgress.values()).reduce((sum, p) => sum + p.progressPercentage, 0) / goals.length) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No goals set yet</h2>
          <p className="text-gray-600 mb-6">
            Set your first running goal to start tracking your progress and stay motivated.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {goals.map(goal => {
            const progress = goalProgress.get(goal.id);
            if (!progress) return null;

            const currentFormatted = formatValue(progress.progressPercentage * goal.targetValue / 100, goal.unit);
            const targetFormatted = formatValue(goal.targetValue, goal.unit);

            return (
              <div key={goal.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 mr-3">{goal.title}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getGoalStatusColor(goal, progress)}`}>
                          {goal.status}
                        </span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                          goal.priority === 'high' ? 'bg-red-100 text-red-800' :
                          goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {goal.priority} priority
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{goal.description}</p>
                      
                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>{currentFormatted}</span>
                          <span>{targetFormatted}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(progress.progressPercentage, progress.isOnTrack)}`}
                            style={{ width: `${Math.min(100, progress.progressPercentage)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>{progress.progressPercentage.toFixed(1)}% complete</span>
                          <span className={progress.isOnTrack ? 'text-green-600' : 'text-orange-600'}>
                            {progress.isOnTrack ? '✓ On track' : '⚠ Behind schedule'}
                          </span>
                        </div>
                      </div>

                      {/* Goal Details */}
                      <div className="flex items-center text-xs text-gray-500 space-x-4">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                        <span>
                          {progress.daysRemaining > 0 ? `${progress.daysRemaining} days left` : 'Overdue'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => setSelectedGoal(goal)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit goal"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Insights */}
                  {progress.insights.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-blue-800 mb-1">Latest Insight</h4>
                      <p className="text-sm text-blue-700">{progress.insights[0]}</p>
                    </div>
                  )}

                  {/* Recommendations */}
                  {progress.recommendations.length > 0 && (
                    <div className="mt-3 bg-green-50 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-green-800 mb-1">Recommendation</h4>
                      <p className="text-sm text-green-700">{progress.recommendations[0]}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Insights Section */}
      <div className="mt-8">
        <AIInsights 
          runs={runs} 
          goals={goals.map(g => ({
            id: g.id,
            type: g.type,
            target: g.targetValue,
            targetDate: g.targetDate,
            priority: g.priority,
            createdAt: g.createdAt
          }))}
          className="mb-6"
        />
      </div>

      {/* Create Goal Modal */}
      {showCreateModal && (
        <CreateGoalModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateGoal}
        />
      )}

      {/* Edit Goal Modal */}
      {selectedGoal && (
        <EditGoalModal
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onSubmit={(updatedGoal) => {
            setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
            setSelectedGoal(null);
          }}
        />
      )}
    </main>
  );
};

// Create Goal Modal Component
const CreateGoalModal: React.FC<{
  onClose: () => void;
  onSubmit: (goal: CreateGoalRequest) => void;
}> = ({ onClose, onSubmit }) => {
  const [step, setStep] = useState<'templates' | 'custom'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null);
  const [formData, setFormData] = useState<CreateGoalRequest>({
    type: 'distance',
    title: '',
    description: '',
    targetValue: 0,
    unit: 'meters',
    targetDate: '',
    priority: 'medium',
    category: 'annual'
  });

  const popularTemplates = getPopularTemplates();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'distance' | 'pace' | 'frequency' | 'time'>('all');

  const getFilteredTemplates = () => {
    if (selectedCategory === 'all') return popularTemplates;
    return getTemplatesByCategory(selectedCategory);
  };

  const handleTemplateSelect = (template: GoalTemplate) => {
    setSelectedTemplate(template);
    // Auto-fill form with template data
    const targetDate = template.timeframe === 'annual' ? '2025-12-31' : 
                      template.timeframe === 'monthly' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
                      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const goalRequest = templateToGoalRequest(template, targetDate);
    setFormData(goalRequest);
    setStep('custom');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title && formData.targetValue > 0 && formData.targetDate) {
      onSubmit(formData);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Goal</h2>
        
        {step === 'templates' ? (
          <div className="space-y-4">
            {/* Template Categories */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(['all', 'distance', 'pace', 'frequency', 'time'] as const).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category === 'all' ? 'Popular' : category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {getFilteredTemplates().map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="border rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 text-sm">{template.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                      {template.difficulty}
                    </span>
                  </div>
                  <p className="text-gray-600 text-xs mb-3 line-clamp-2">{template.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {template.estimatedTimeCommitment}
                    </span>
                    <span className="flex items-center">
                      <Star className="w-3 h-3 mr-1" />
                      {template.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Goal Option */}
            <div className="border-t pt-4">
              <button
                onClick={() => setStep('custom')}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center justify-center">
                  <Plus className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="text-gray-600 font-medium">Create Custom Goal</span>
                </div>
              </button>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                type: e.target.value as any,
                unit: e.target.value === 'distance' ? 'meters' : 
                      e.target.value === 'frequency' ? 'runs' : 
                      e.target.value === 'time' ? 'seconds' : 'seconds'
              }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="distance">Distance Goal</option>
              <option value="time">Time Goal</option>
              <option value="frequency">Frequency Goal</option>
              <option value="pace">Pace Goal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Run 1000km in 2025"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
              <input
                type="number"
                value={formData.targetValue}
                onChange={(e) => setFormData(prev => ({ ...prev, targetValue: Number(e.target.value) }))}
                placeholder="1000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
              <input
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Goal
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

// Edit Goal Modal Component (simplified for now)
const EditGoalModal: React.FC<{
  goal: Goal;
  onClose: () => void;
  onSubmit: (goal: Goal) => void;
}> = ({ goal, onClose, onSubmit }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Goal</h2>
        <p className="text-gray-600 mb-4">Goal editing functionality coming soon!</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};