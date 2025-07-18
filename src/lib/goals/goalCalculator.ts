// GoalCalculator - Robust progress calculation with data quality filtering
import { EnrichedRun } from '../../types';
import { Goal, GoalProgress } from './goalTypes';
import { DataQualityFilter } from './dataQualityFilter';

export class GoalCalculator {
  /**
   * Calculate progress for any goal type with robust data filtering
   */
  static calculateGoalProgress(goal: Goal, runs: EnrichedRun[]): GoalProgress {
    const now = new Date();
    const targetDate = new Date(goal.targetDate);
    const createdDate = new Date(goal.createdAt);
    
    // Handle edge cases
    if (targetDate <= createdDate) {
      throw new Error('Target date must be after creation date');
    }
    
    const totalDays = Math.ceil((targetDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.max(0, totalDays - daysRemaining);
    
    let currentValue = 0;
    let progressPercentage = 0;
    let insights: string[] = [];
    let recommendations: string[] = [];

    // Calculate progress based on goal type
    switch (goal.type) {
      case 'distance':
        currentValue = this.calculateDistanceProgress(goal, runs);
        break;
      case 'pace':
        currentValue = this.calculatePaceProgress(goal, runs);
        break;
      case 'runs':
        currentValue = this.calculateRunsProgress(goal, runs);
        break;
      default:
        throw new Error(`Unsupported goal type: ${goal.type}`);
    }

    // Calculate progress percentage
    if (goal.type === 'pace') {
      // For pace goals, if we achieved the target time, we're at 100%
      progressPercentage = currentValue > 0 && currentValue <= goal.targetValue ? 100 : 0;
    } else {
      progressPercentage = Math.min(100, (currentValue / goal.targetValue) * 100);
    }
    
    // Calculate if on track (are we at least 90% of where we should be?)
    const expectedProgress = daysElapsed > 0 ? (daysElapsed / totalDays) * 100 : 0;
    const isOnTrack = progressPercentage >= expectedProgress * 0.9 || progressPercentage >= 100;

    // Generate insights and recommendations
    insights = this.generateInsights(goal, currentValue, progressPercentage, isOnTrack, daysRemaining);
    recommendations = this.generateRecommendations(goal, currentValue, progressPercentage, isOnTrack, daysRemaining);

    // Calculate projected completion
    const projectedCompletion = this.calculateProjectedCompletion(
      goal, 
      progressPercentage, 
      daysElapsed, 
      now
    );

    return {
      goalId: goal.id,
      progressPercentage,
      isOnTrack,
      projectedCompletion,
      daysRemaining: Math.max(0, daysRemaining),
      milestones: [], // TODO: Implement milestone tracking
      insights,
      recommendations
    };
  }

  /**
   * Calculate distance goal progress with data quality filtering
   */
  private static calculateDistanceProgress(goal: Goal, runs: EnrichedRun[]): number {
    const targetDate = new Date(goal.targetDate);
    const createdDate = new Date(goal.createdAt);
    
    // Use DataQualityFilter to get clean, relevant runs
    const relevantRuns = DataQualityFilter.filterRunsByTimeframe(runs, createdDate, targetDate);
    const totalDistance = relevantRuns.reduce((total, run) => total + run.distance, 0);
    
    return totalDistance;
  }

  /**
   * Calculate pace goal progress - find best time for target race distance
   */
  private static calculatePaceProgress(goal: Goal, runs: EnrichedRun[]): number {
    if (!goal.raceDistance) {
      throw new Error('Pace goal must have a race distance specified');
    }
    
    // Use DataQualityFilter to get runs within distance tolerance (±10%)
    const relevantRuns = DataQualityFilter.filterRunsForPaceGoal(runs, goal.raceDistance, 0.1);
    
    if (relevantRuns.length === 0) {
      return 0; // No qualifying runs yet
    }
    
    // Find the best (fastest) time for this distance
    const bestTime = Math.min(...relevantRuns.map(run => run.moving_time));
    
    return bestTime; // Return best time achieved (in seconds)
  }

  /**
   * Calculate runs goal progress with data quality filtering
   */
  private static calculateRunsProgress(goal: Goal, runs: EnrichedRun[]): number {
    const targetDate = new Date(goal.targetDate);
    const createdDate = new Date(goal.createdAt);
    
    // Use DataQualityFilter to get clean, relevant runs
    const relevantRuns = DataQualityFilter.filterRunsByTimeframe(runs, createdDate, targetDate);
    return relevantRuns.length; // Number of valid runs
  }

  /**
   * Generate insights based on goal progress
   */
  private static generateInsights(
    goal: Goal,
    currentValue: number,
    progressPercentage: number,
    isOnTrack: boolean,
    daysRemaining: number
  ): string[] {
    const insights: string[] = [];
    
    if (progressPercentage >= 100) {
      insights.push(`🎉 Congratulations! You've achieved your ${goal.title} goal!`);
      
      if (goal.type === 'pace') {
        const achievedTime = DataQualityFilter.formatTime(currentValue);
        const targetTime = DataQualityFilter.formatTime(goal.targetValue);
        insights.push(`🏃‍♂️ Your best time: ${achievedTime} (target was ${targetTime})`);
      }
    } else if (isOnTrack) {
      insights.push(`✅ You're on track to achieve your ${goal.title} goal with ${daysRemaining} days remaining.`);
      
      if (progressPercentage > 50) {
        insights.push(`💪 Great progress! You're ${progressPercentage.toFixed(1)}% of the way there.`);
      }
    } else {
      insights.push(`⚠️ You're behind schedule on your ${goal.title} goal. ${Math.round(100 - progressPercentage)}% remaining.`);
      
      if (daysRemaining > 30) {
        insights.push(`⏰ Don't worry, you still have ${daysRemaining} days to catch up!`);
      }
    }
    
    // Add progress rate insight
    if (progressPercentage > 0 && progressPercentage < 100) {
      const createdDate = new Date(goal.createdAt);
      const daysElapsed = Math.max(1, Math.ceil((new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));
      const rate = progressPercentage / daysElapsed;
      
      if (rate > 0.5) {
        insights.push(`🚀 Strong momentum! You're making ${rate.toFixed(1)}% progress per day.`);
      } else if (rate > 0.1) {
        insights.push(`📈 Steady progress at ${rate.toFixed(1)}% per day.`);
      }
    }
    
    return insights;
  }

  /**
   * Generate recommendations based on goal progress
   */
  private static generateRecommendations(
    goal: Goal,
    currentValue: number,
    progressPercentage: number,
    isOnTrack: boolean,
    daysRemaining: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (progressPercentage >= 100) {
      // Goal achieved - suggest next steps
      recommendations.push(`🎯 Consider setting a more ambitious ${goal.type} goal to keep challenging yourself!`);
      return recommendations;
    }
    
    if (!isOnTrack && daysRemaining > 0) {
      // Behind schedule - provide specific catch-up advice
      switch (goal.type) {
        case 'distance':
          const remainingDistance = (goal.targetValue - currentValue) / 1000;
          const dailyTarget = remainingDistance / daysRemaining;
          
          if (dailyTarget > 10) {
            recommendations.push(`🚨 You need ${dailyTarget.toFixed(1)}km per day - consider adjusting your goal timeline.`);
          } else {
            recommendations.push(`🏃‍♂️ Run ${dailyTarget.toFixed(1)}km per day to get back on track.`);
            
            if (dailyTarget > 5) {
              recommendations.push(`💡 Try splitting into 2 shorter runs per day to make it manageable.`);
            }
          }
          break;
          
        case 'runs':
          const remainingRuns = goal.targetValue - currentValue;
          const runsPerWeek = (remainingRuns / daysRemaining) * 7;
          
          if (runsPerWeek > 7) {
            recommendations.push(`🚨 You need ${Math.ceil(runsPerWeek)} runs per week - consider adjusting your goal.`);
          } else {
            recommendations.push(`📅 Aim for ${Math.ceil(runsPerWeek)} runs per week to stay on track.`);
            
            if (runsPerWeek > 4) {
              recommendations.push(`💡 Include shorter, easier runs to maintain consistency without burnout.`);
            }
          }
          break;
          
        case 'pace':
          const currentBest = currentValue > 0 ? DataQualityFilter.formatTime(currentValue) : 'No qualifying runs yet';
          const target = DataQualityFilter.formatTime(goal.targetValue);
          
          recommendations.push(`⚡ Current best: ${currentBest}, target: ${target}`);
          recommendations.push(`🏃‍♂️ Include interval training: 4x800m at target pace with 2min rest.`);
          recommendations.push(`🎯 Add tempo runs at slightly slower than target pace to build endurance.`);
          
          if (currentValue > goal.targetValue * 1.2) {
            recommendations.push(`💪 Focus on speed work - you need significant pace improvement.`);
          }
          break;
      }
    } else if (isOnTrack) {
      // On track - provide maintenance advice
      recommendations.push(`👍 Keep up your current training approach - you're doing great!`);
      
      switch (goal.type) {
        case 'distance':
          recommendations.push(`🔄 Maintain your current weekly mileage and consider adding variety to your routes.`);
          break;
        case 'runs':
          recommendations.push(`📈 Great consistency! Consider gradually increasing your run distances.`);
          break;
        case 'pace':
          recommendations.push(`⚡ Continue your speed work and consider race simulation runs.`);
          break;
      }
    }
    
    // Time-sensitive recommendations
    if (daysRemaining < 30 && progressPercentage < 80) {
      recommendations.push(`🚨 Less than 30 days left - consider adjusting your goal to be more realistic.`);
    } else if (daysRemaining < 7 && progressPercentage < 95) {
      recommendations.push(`⏰ Final week push! Focus on consistency rather than intensity.`);
    }
    
    return recommendations;
  }

  /**
   * Calculate projected completion date based on current progress
   */
  private static calculateProjectedCompletion(
    goal: Goal,
    progressPercentage: number,
    daysElapsed: number,
    now: Date
  ): string {
    if (progressPercentage >= 100) {
      return now.toISOString(); // Already completed
    }
    
    if (progressPercentage === 0 || daysElapsed === 0) {
      // No progress yet, return target date
      return goal.targetDate;
    }
    
    // Calculate current rate and project completion
    const currentRate = progressPercentage / daysElapsed;
    const remainingProgress = 100 - progressPercentage;
    const projectedDaysToComplete = remainingProgress / Math.max(0.1, currentRate);
    
    const projectedDate = new Date(now.getTime() + projectedDaysToComplete * 24 * 60 * 60 * 1000);
    
    // Don't project beyond a reasonable timeframe (2x the original timeline)
    const originalTimeframe = new Date(goal.targetDate).getTime() - new Date(goal.createdAt).getTime();
    const maxProjectedDate = new Date(new Date(goal.createdAt).getTime() + originalTimeframe * 2);
    
    if (projectedDate > maxProjectedDate) {
      return maxProjectedDate.toISOString();
    }
    
    return projectedDate.toISOString();
  }

  /**
   * Validate goal data before calculation
   */
  static validateGoal(goal: Goal): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basic validation
    if (!goal.targetValue || goal.targetValue <= 0) {
      errors.push('Target value must be greater than 0');
    }
    
    if (!goal.targetDate) {
      errors.push('Target date is required');
    } else {
      const targetDate = new Date(goal.targetDate);
      const createdDate = new Date(goal.createdAt);
      
      if (targetDate <= createdDate) {
        errors.push('Target date must be after creation date');
      }
      
      if (targetDate <= new Date()) {
        errors.push('Target date must be in the future');
      }
    }
    
    // Type-specific validation
    switch (goal.type) {
      case 'distance':
        if (goal.unit !== 'meters') {
          errors.push('Distance goals must use meters as unit');
        }
        if (goal.targetValue > 100000000) { // 100,000 km
          errors.push('Distance target seems unrealistic');
        }
        break;
        
      case 'pace':
        if (goal.unit !== 'seconds') {
          errors.push('Pace goals must use seconds as unit');
        }
        if (!goal.raceDistance) {
          errors.push('Pace goals must specify race distance');
        }
        if (goal.targetValue < 600) { // Under 10 minutes
          errors.push('Pace target seems unrealistic');
        }
        break;
        
      case 'runs':
        if (goal.unit !== 'runs') {
          errors.push('Runs goals must use runs as unit');
        }
        if (goal.targetValue > 1000) {
          errors.push('Runs target seems unrealistic');
        }
        break;
        
      default:
        errors.push(`Unsupported goal type: ${goal.type}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}