// AI Coach Client - Frontend service for AI coaching features
import { Run, Goal } from '../types';

export interface AICoachResponse {
  success: boolean;
  action: string;
  response: any;
  error?: string;
}

export interface GoalAnalysis {
  feasibility: 'realistic' | 'challenging' | 'too_ambitious';
  recommendations: string[];
  milestones: string[];
  successProbability: number;
  adjustments?: string[];
  risks?: string[];
}

export interface TrainingInsight {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionSteps: string[];
  category: 'training' | 'recovery' | 'performance' | 'goal';
}

export interface ProgressAssessment {
  status: 'on_track' | 'behind' | 'ahead';
  message: string;
  adjustments: string[];
  nextSteps: string[];
  motivationalMessage?: string;
}

class AICoachClient {
  private baseUrl: string;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 5000; // 5 seconds between requests
  private readonly MAX_REQUESTS_PER_HOUR = 10; // Limit to 10 requests per hour
  private requestTimes: number[] = [];

  constructor() {
    this.baseUrl = '/.netlify/functions';
  }

  private async makeRequest(action: string, data: any): Promise<AICoachResponse> {
    // Rate limiting check
    const now = Date.now();
    
    // Check minimum interval between requests
    if (now - this.lastRequestTime < this.MIN_REQUEST_INTERVAL) {
      throw new Error('Rate limit: Please wait a few seconds between AI Coach requests');
    }
    
    // Clean old request times (older than 1 hour)
    this.requestTimes = this.requestTimes.filter(time => now - time < 60 * 60 * 1000);
    
    // Check hourly request limit
    if (this.requestTimes.length >= this.MAX_REQUESTS_PER_HOUR) {
      throw new Error('Rate limit: Maximum AI Coach requests per hour exceeded. Please try again later.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/ai-coach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, data }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Check for specific error types
        if (responseData.error === 'CONFIG_ERROR') {
          throw new Error('CONFIG_ERROR: ' + responseData.message);
        }
        throw new Error(`HTTP ${response.status}: ${responseData.message || response.statusText}`);
      }

      // Update rate limiting tracking on successful request
      this.lastRequestTime = now;
      this.requestTimes.push(now);

      return responseData;
    } catch (error) {
      console.error('[AICoachClient] Request failed:', error);
      throw error;
    }
  }

  async analyzeGoals(runs: Run[], goals: Goal[]): Promise<GoalAnalysis[]> {
    const runningHistory = this.calculateRunningHistory(runs);
    
    const response = await this.makeRequest('analyze_goals', {
      runningHistory,
      proposedGoals: goals.map(goal => ({
        type: goal.type,
        target: goal.target,
        targetDate: goal.targetDate,
        priority: goal.priority
      }))
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to analyze goals');
    }

    // Ensure we return an array of analyses, one per goal
    if (Array.isArray(response.response)) {
      return response.response;
    } else {
      // If single analysis returned, apply to all goals
      return goals.map(() => response.response);
    }
  }

  async generateInsights(runs: Run[], goals?: Goal[]): Promise<TrainingInsight[]> {
    const performanceMetrics = this.calculatePerformanceMetrics(runs);
    
    const response = await this.makeRequest('generate_insights', {
      runs: runs.slice(0, 20), // Last 20 runs for context
      performanceMetrics,
      goals: goals || []
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to generate insights');
    }

    return Array.isArray(response.response) ? response.response : [response.response];
  }

  async assessProgress(goals: Goal[], runs: Run[]): Promise<ProgressAssessment[]> {
    const currentProgress = goals.map(goal => ({
      goalId: goal.id,
      progress: this.calculateGoalProgress(goal, runs),
      timeRemaining: this.calculateTimeRemaining(goal.targetDate)
    }));

    const response = await this.makeRequest('assess_progress', {
      goals,
      currentProgress,
      timeRemaining: Math.min(...currentProgress.map(p => p.timeRemaining))
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to assess progress');
    }

    return Array.isArray(response.response) ? response.response : [response.response];
  }

  async createTrainingPlan(runs: Run[], goals: Goal[], preferences: any = {}): Promise<any> {
    const currentFitness = this.calculateCurrentFitness(runs);
    const timeframe = goals.length > 0 ? 
      Math.max(...goals.map(g => this.calculateTimeRemaining(g.targetDate))) : 12;

    const response = await this.makeRequest('create_training_plan', {
      currentFitness,
      goals,
      timeframe,
      preferences
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to create training plan');
    }

    return response.response;
  }

  private calculateRunningHistory(runs: Run[]) {
    if (runs.length === 0) {
      return {
        totalRuns: 0,
        totalDistance: 0,
        averagePace: 0,
        trend: 'stable',
        consistency: 'low'
      };
    }

    const totalDistance = runs.reduce((sum, run) => sum + run.distance, 0);
    const totalTime = runs.reduce((sum, run) => sum + run.moving_time, 0);
    const averagePace = totalTime / (totalDistance / 1000); // seconds per km

    // Calculate trend (last 5 vs previous 5 runs)
    const recent = runs.slice(0, 5);
    const previous = runs.slice(5, 10);
    const recentAvgPace = recent.length > 0 ? 
      recent.reduce((sum, run) => sum + (run.moving_time / (run.distance / 1000)), 0) / recent.length : 0;
    const previousAvgPace = previous.length > 0 ? 
      previous.reduce((sum, run) => sum + (run.moving_time / (run.distance / 1000)), 0) / previous.length : 0;

    let trend = 'stable';
    if (recentAvgPace < previousAvgPace * 0.95) trend = 'improving';
    else if (recentAvgPace > previousAvgPace * 1.05) trend = 'declining';

    // Calculate consistency (runs per week over last month)
    const lastMonth = runs.filter(run => 
      new Date(run.start_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    const weeksInMonth = 4;
    const runsPerWeek = lastMonth.length / weeksInMonth;
    let consistency = 'low';
    if (runsPerWeek >= 3) consistency = 'high';
    else if (runsPerWeek >= 2) consistency = 'moderate';

    return {
      totalRuns: runs.length,
      totalDistance,
      averagePace,
      trend,
      consistency
    };
  }

  private calculatePerformanceMetrics(runs: Run[]) {
    if (runs.length === 0) {
      return {
        recentPace: 0,
        distanceTrend: 'stable',
        consistencyScore: 0,
        effortVariability: 0,
        bestConditions: 'unknown',
        improvementAreas: ['Increase training frequency'],
        strengths: ['Getting started with running']
      };
    }

    const recent10 = runs.slice(0, 10);
    const recentPace = recent10.reduce((sum, run) => 
      sum + (run.moving_time / (run.distance / 1000)), 0) / recent10.length;

    // Distance trend
    const recentAvgDistance = recent10.reduce((sum, run) => sum + run.distance, 0) / recent10.length;
    const previousAvgDistance = runs.slice(10, 20).length > 0 ?
      runs.slice(10, 20).reduce((sum, run) => sum + run.distance, 0) / runs.slice(10, 20).length : recentAvgDistance;
    
    let distanceTrend = 'stable';
    if (recentAvgDistance > previousAvgDistance * 1.1) distanceTrend = 'increasing';
    else if (recentAvgDistance < previousAvgDistance * 0.9) distanceTrend = 'decreasing';

    // Consistency score (0-100)
    const lastMonth = runs.filter(run => 
      new Date(run.start_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    const consistencyScore = Math.min(100, (lastMonth.length / 4) * 25); // 4 runs per week = 100%

    // Effort variability
    const paces = recent10.map(run => run.moving_time / (run.distance / 1000));
    const avgPace = paces.reduce((sum, pace) => sum + pace, 0) / paces.length;
    const variance = paces.reduce((sum, pace) => sum + Math.pow(pace - avgPace, 2), 0) / paces.length;
    const effortVariability = Math.sqrt(variance) / avgPace * 100;

    return {
      recentPace,
      distanceTrend,
      consistencyScore,
      effortVariability,
      bestConditions: 'Moderate weather conditions',
      improvementAreas: effortVariability > 15 ? ['Pace consistency'] : ['Endurance building'],
      strengths: consistencyScore > 75 ? ['Excellent consistency'] : ['Regular training']
    };
  }

  private calculateCurrentFitness(runs: Run[]) {
    if (runs.length === 0) {
      return {
        weeklyMileage: 0,
        averagePace: 0,
        longRunDistance: 0,
        frequency: 0
      };
    }

    // Last 4 weeks
    const lastMonth = runs.filter(run => 
      new Date(run.start_date) > new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
    );

    const weeklyMileage = lastMonth.reduce((sum, run) => sum + run.distance, 0) / 1000 / 4;
    const averagePace = lastMonth.length > 0 ?
      lastMonth.reduce((sum, run) => sum + (run.moving_time / (run.distance / 1000)), 0) / lastMonth.length : 0;
    const longRunDistance = Math.max(...lastMonth.map(run => run.distance)) / 1000;
    const frequency = lastMonth.length / 4;

    return {
      weeklyMileage,
      averagePace,
      longRunDistance,
      frequency
    };
  }

  private calculateGoalProgress(goal: Goal, runs: Run[]): number {
    const relevantRuns = runs.filter(run => 
      new Date(run.start_date) >= new Date(goal.createdAt)
    );

    switch (goal.type) {
      case 'distance':
        const totalDistance = relevantRuns.reduce((sum, run) => sum + run.distance, 0) / 1000;
        return Math.min(100, (totalDistance / goal.target) * 100);
      
      case 'pace':
        const recentRuns = relevantRuns.slice(0, 5);
        if (recentRuns.length === 0) return 0;
        const avgPace = recentRuns.reduce((sum, run) => 
          sum + (run.moving_time / (run.distance / 1000)), 0) / recentRuns.length;
        const targetPaceSeconds = goal.target * 60; // target is in minutes per km
        return avgPace <= targetPaceSeconds ? 100 : Math.max(0, 100 - ((avgPace - targetPaceSeconds) / targetPaceSeconds * 100));
      
      case 'consistency':
        const weeksActive = Math.ceil((Date.now() - new Date(goal.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000));
        const expectedRuns = weeksActive * goal.target; // target is runs per week
        return Math.min(100, (relevantRuns.length / expectedRuns) * 100);
      
      default:
        return 0;
    }
  }

  private calculateTimeRemaining(targetDate: string): number {
    const target = new Date(targetDate);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (7 * 24 * 60 * 60 * 1000))); // weeks
  }
}

export const aiCoachClient = new AICoachClient();