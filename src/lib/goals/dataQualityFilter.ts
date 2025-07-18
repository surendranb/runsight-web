// Data Quality Filter for Goal Progress Calculation
// Filters out GPS errors, data anomalies, and outliers from running data

import { EnrichedRun } from '../../types';

export class DataQualityFilter {
  // Filter out GPS errors and data anomalies
  static filterValidRuns(runs: EnrichedRun[]): EnrichedRun[] {
    return runs.filter(run => this.isValidRun(run));
  }

  private static isValidRun(run: EnrichedRun): boolean {
    // Filter out GPS errors - distance outliers
    if (run.distance < 500 || run.distance > 200000) { // 0.5km to 200km
      return false;
    }

    // Filter out runs with zero or negative time
    if (run.moving_time <= 0) {
      return false;
    }

    // Filter out pace outliers
    const pacePerKm = run.moving_time / (run.distance / 1000);
    if (pacePerKm < 150 || pacePerKm > 720) { // 2:30/km to 12:00/km
      return false;
    }

    // Filter out runs with unrealistic speed (faster than world record pace)
    const speedKmh = (run.distance / 1000) / (run.moving_time / 3600);
    if (speedKmh > 25) { // Faster than ~2:24/km (world record territory)
      return false;
    }

    // Filter out runs with unrealistic elevation gain (likely GPS errors)
    if (run.total_elevation_gain && run.total_elevation_gain > run.distance) {
      // If elevation gain is more than the distance, it's likely a GPS error
      return false;
    }

    return true;
  }

  // For pace goals, filter runs within distance tolerance
  static filterRunsForPaceGoal(runs: EnrichedRun[], targetDistance: number, tolerance = 0.1): EnrichedRun[] {
    const validRuns = this.filterValidRuns(runs);
    const minDistance = targetDistance * (1 - tolerance);
    const maxDistance = targetDistance * (1 + tolerance);
    
    return validRuns.filter(run => 
      run.distance >= minDistance && run.distance <= maxDistance
    );
  }

  // Filter runs by timeframe for goal calculations
  static filterRunsByTimeframe(runs: EnrichedRun[], startDate: Date, endDate: Date): EnrichedRun[] {
    const validRuns = this.filterValidRuns(runs);
    
    return validRuns.filter(run => {
      const runDate = new Date(run.start_date_local || run.start_date);
      return runDate >= startDate && runDate <= endDate;
    });
  }

  // Get statistics about filtered data for debugging
  static getFilterStats(originalRuns: EnrichedRun[]): {
    total: number;
    valid: number;
    filtered: number;
    filterReasons: {
      distanceOutliers: number;
      paceOutliers: number;
      timeInvalid: number;
      speedOutliers: number;
      elevationOutliers: number;
    };
  } {
    const stats = {
      total: originalRuns.length,
      valid: 0,
      filtered: 0,
      filterReasons: {
        distanceOutliers: 0,
        paceOutliers: 0,
        timeInvalid: 0,
        speedOutliers: 0,
        elevationOutliers: 0
      }
    };

    originalRuns.forEach(run => {
      let isValid = true;
      
      // Check distance outliers
      if (run.distance < 500 || run.distance > 200000) {
        stats.filterReasons.distanceOutliers++;
        isValid = false;
      }

      // Check time validity
      if (run.moving_time <= 0) {
        stats.filterReasons.timeInvalid++;
        isValid = false;
      }

      // Check pace outliers (only if time is valid)
      if (run.moving_time > 0) {
        const pacePerKm = run.moving_time / (run.distance / 1000);
        if (pacePerKm < 150 || pacePerKm > 720) {
          stats.filterReasons.paceOutliers++;
          isValid = false;
        }
      }

      // Check speed outliers (only if time is valid)
      if (run.moving_time > 0) {
        const speedKmh = (run.distance / 1000) / (run.moving_time / 3600);
        if (speedKmh > 25) {
          stats.filterReasons.speedOutliers++;
          isValid = false;
        }
      }

      // Check elevation outliers
      if (run.total_elevation_gain && run.total_elevation_gain > run.distance) {
        stats.filterReasons.elevationOutliers++;
        isValid = false;
      }

      if (isValid) {
        stats.valid++;
      } else {
        stats.filtered++;
      }
    });

    return stats;
  }

  // Format pace for display (seconds per km to MM:SS format)
  static formatPace(secondsPerKm: number): string {
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Format distance for display
  static formatDistance(meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    } else {
      return `${meters}m`;
    }
  }

  // Format time for display
  static formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }
}