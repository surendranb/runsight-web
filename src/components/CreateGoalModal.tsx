import React, { useState } from 'react';
import { X, Target, Clock, Activity, ChevronRight, ChevronLeft } from 'lucide-react';
import { CreateGoalRequest } from '../lib/goals/goalTypes';
import {
  DISTANCE_SUGGESTIONS,
  PACE_TARGET_TIMES,
  RACE_DISTANCES,
  RUNS_SUGGESTIONS,
  TIMEFRAME_OPTIONS,
  PRIORITY_OPTIONS,
  generateGoalTitle,
  generateGoalDescription,
  formatTimeFromSeconds
} from '../lib/goals/goalDropdownOptions';

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: CreateGoalRequest) => Promise<void>;
}

type GoalType = 'distance' | 'pace' | 'runs';
type Step = 'type' | 'details' | 'timeframe' | 'review';

interface FormData {
  type: GoalType;
  targetValue: number;
  unit: string;
  timeframe: 'yearly' | 'monthly' | 'custom';
  customDate: string;
  priority: 'high' | 'medium' | 'low';
  raceDistance?: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const CreateGoalModal: React.FC<CreateGoalModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [step, setStep] = useState<Step>('type');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    type: 'distance',
    targetValue: 0,
    unit: 'meters',
    timeframe: 'yearly',
    customDate: '',
    priority: 'medium',
    difficulty: 'intermediate'
  });

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('type');
    setFormData({
      type: 'distance',
      targetValue: 0,
      unit: 'meters',
      timeframe: 'yearly',
      customDate: '',
      priority: 'medium',
      difficulty: 'intermediate'
    });
    onClose();
  };

  const getTargetDate = (): string => {
    if (formData.timeframe === 'custom') {
      return formData.customDate;
    } else if (formData.timeframe === 'yearly') {
      return '2025-12-31';
    } else {
      // Monthly - end of current month
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return lastDay.toISOString().split('T')[0];
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const targetDate = getTargetDate();
      const title = generateGoalTitle(formData.type, formData.targetValue, formData.timeframe, formData.raceDistance);
      const description = generateGoalDescription(formData.type, formData.targetValue, formData.timeframe, formData.difficulty, formData.raceDistance);

      const goalRequest: CreateGoalRequest = {
        type: formData.type,
        title,
        description,
        targetValue: formData.targetValue,
        unit: formData.unit,
        targetDate,
        priority: formData.priority,
        category: formData.timeframe === 'yearly' ? 'annual' : 
                 formData.timeframe === 'monthly' ? 'monthly' : 'race_specific',
        additionalDetails: {
          raceDistance: formData.raceDistance,
          timeframe: formData.timeframe,
          difficulty: formData.difficulty
        }
      };

      await onSubmit(goalRequest);
      handleClose();
    } catch (error) {
      console.error('Failed to create goal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = ['type', 'details', 'timeframe', 'review'];
    const currentIndex = steps.indexOf(step);

    return (
      <div className="flex items-center justify-center mb-6">
        {steps.map((stepName, index) => (
          <React.Fragment key={stepName}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              index <= currentIndex 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-500'
            }`}>
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-12 h-1 mx-2 ${
                index < currentIndex ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderTypeSelection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">What type of goal do you want to set?</h3>
      
      <div className="grid grid-cols-1 gap-4">
        {[
          { type: 'distance' as const, icon: Target, title: 'Distance Goal', description: 'Total distance to run (e.g., 1000km this year)' },
          { type: 'pace' as const, icon: Clock, title: 'Pace Goal', description: 'Target time for a race distance (e.g., 5K under 25 minutes)' },
          { type: 'runs' as const, icon: Activity, title: 'Runs Goal', description: 'Number of runs to complete (e.g., 100 runs this year)' }
        ].map(({ type, icon: Icon, title, description }) => (
          <button
            key={type}
            onClick={() => {
              setFormData(prev => ({ 
                ...prev, 
                type,
                unit: type === 'distance' ? 'meters' : type === 'pace' ? 'seconds' : 'runs',
                targetValue: 0
              }));
              setStep('details');
            }}
            className={`p-4 border-2 rounded-lg text-left transition-all hover:border-blue-500 hover:shadow-md ${
              formData.type === type ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Icon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{title}</h4>
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderDistanceDetails = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Distance Goal Details</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Distance (km)
        </label>
        <input
          type="number"
          value={formData.targetValue ? formData.targetValue / 1000 : ''}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            targetValue: Number(e.target.value) * 1000 
          }))}
          placeholder="Enter distance in km (e.g., 1000)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          min="1"
          step="1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Popular Suggestions
        </label>
        <div className="grid grid-cols-2 gap-2">
          {DISTANCE_SUGGESTIONS.yearly.map((suggestion) => (
            <button
              key={suggestion.value}
              onClick={() => setFormData(prev => ({ 
                ...prev, 
                targetValue: suggestion.value * 1000,
                difficulty: suggestion.difficulty
              }))}
              className={`p-3 border rounded-lg text-left hover:border-blue-500 transition-colors ${
                formData.targetValue === suggestion.value * 1000 ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="font-medium text-gray-900">{suggestion.label}</div>
              <div className="text-xs text-gray-500">{suggestion.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPaceDetails = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Pace Goal Details</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Race Distance
        </label>
        <div className="grid grid-cols-2 gap-2">
          {RACE_DISTANCES.map((race) => (
            <button
              key={race.value}
              onClick={() => setFormData(prev => ({ 
                ...prev, 
                raceDistance: race.value,
                targetValue: 0
              }))}
              className={`p-3 border rounded-lg text-center hover:border-blue-500 transition-colors ${
                formData.raceDistance === race.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="font-medium text-gray-900">{race.label}</div>
              <div className="text-xs text-gray-500">{race.description}</div>
            </button>
          ))}
        </div>
      </div>

      {formData.raceDistance && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Time
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PACE_TARGET_TIMES[formData.raceDistance as keyof typeof PACE_TARGET_TIMES]?.map((time) => (
              <button
                key={time.value}
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  targetValue: time.value,
                  difficulty: time.difficulty
                }))}
                className={`p-3 border rounded-lg text-left hover:border-blue-500 transition-colors ${
                  formData.targetValue === time.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="font-medium text-gray-900">{time.label}</div>
                <div className="text-xs text-gray-500">{time.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderRunsDetails = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Runs Goal Details</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Number of Runs
        </label>
        <input
          type="number"
          value={formData.targetValue || ''}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            targetValue: Number(e.target.value)
          }))}
          placeholder="Enter number of runs (e.g., 100)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          min="1"
          step="1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Popular Suggestions
        </label>
        <div className="grid grid-cols-2 gap-2">
          {RUNS_SUGGESTIONS.yearly.map((suggestion) => (
            <button
              key={suggestion.value}
              onClick={() => setFormData(prev => ({ 
                ...prev, 
                targetValue: suggestion.value,
                difficulty: suggestion.difficulty
              }))}
              className={`p-3 border rounded-lg text-left hover:border-blue-500 transition-colors ${
                formData.targetValue === suggestion.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="font-medium text-gray-900">{suggestion.label}</div>
              <div className="text-xs text-gray-500">{suggestion.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTimeframeSelection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">When do you want to achieve this goal?</h3>
      
      <div className="space-y-3">
        {TIMEFRAME_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setFormData(prev => ({ ...prev, timeframe: option.value }))}
            className={`w-full p-4 border-2 rounded-lg text-left transition-all hover:border-blue-500 ${
              formData.timeframe === option.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <div className="font-medium text-gray-900">{option.label}</div>
            <div className="text-sm text-gray-600 mt-1">{option.description}</div>
          </button>
        ))}
      </div>

      {formData.timeframe === 'custom' && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Date
          </label>
          <input
            type="date"
            value={formData.customDate}
            onChange={(e) => setFormData(prev => ({ ...prev, customDate: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
      )}

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Priority Level
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PRIORITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setFormData(prev => ({ ...prev, priority: option.value as any }))}
              className={`p-3 border rounded-lg text-center hover:border-blue-500 transition-colors ${
                formData.priority === option.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="font-medium text-gray-900 text-sm">{option.label}</div>
              <div className="text-xs text-gray-500 mt-1">{option.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderReview = () => {
    const title = generateGoalTitle(formData.type, formData.targetValue, formData.timeframe, formData.raceDistance);
    const description = generateGoalDescription(formData.type, formData.targetValue, formData.timeframe, formData.difficulty, formData.raceDistance);

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Your Goal</h3>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
          <p className="text-gray-600 text-sm mb-4">{description}</p>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Type:</span>
              <span className="ml-2 text-gray-900 capitalize">{formData.type}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Priority:</span>
              <span className="ml-2 text-gray-900 capitalize">{formData.priority}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Target:</span>
              <span className="ml-2 text-gray-900">
                {formData.type === 'distance' ? `${formData.targetValue / 1000}km` :
                 formData.type === 'pace' ? formatTimeFromSeconds(formData.targetValue) :
                 `${formData.targetValue} runs`}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Deadline:</span>
              <span className="ml-2 text-gray-900">
                {formData.timeframe === 'yearly' ? 'End of 2025' :
                 formData.timeframe === 'monthly' ? 'End of this month' :
                 new Date(formData.customDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const canProceed = () => {
    switch (step) {
      case 'type':
        return true;
      case 'details':
        if (formData.type === 'pace') {
          return formData.raceDistance && formData.targetValue > 0;
        }
        return formData.targetValue > 0;
      case 'timeframe':
        return formData.timeframe !== 'custom' || formData.customDate;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Create New Goal</h2>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Step Content */}
          <div className="mb-8">
            {step === 'type' && renderTypeSelection()}
            {step === 'details' && formData.type === 'distance' && renderDistanceDetails()}
            {step === 'details' && formData.type === 'pace' && renderPaceDetails()}
            {step === 'details' && formData.type === 'runs' && renderRunsDetails()}
            {step === 'timeframe' && renderTimeframeSelection()}
            {step === 'review' && renderReview()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => {
                const steps: Step[] = ['type', 'details', 'timeframe', 'review'];
                const currentIndex = steps.indexOf(step);
                if (currentIndex > 0) {
                  setStep(steps[currentIndex - 1]);
                }
              }}
              className={`flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors ${
                step === 'type' ? 'invisible' : ''
              }`}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </button>

            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              
              {step === 'review' ? (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : 'Create Goal'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    const steps: Step[] = ['type', 'details', 'timeframe', 'review'];
                    const currentIndex = steps.indexOf(step);
                    if (currentIndex < steps.length - 1) {
                      setStep(steps[currentIndex + 1]);
                    }
                  }}
                  disabled={!canProceed()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};