// src/lib/insights/consistencyUtils.ts
import { EnrichedRun } from '../../types';

export interface TimeGroupData {
  label: string; // e.g., "Week of Oct 26", "Nov 2023"
  year: number;
  period: number; // Week number or month number (1-12)
  totalDistance: number; // in meters
  totalMovingTime: number; // in seconds
  runCount: number;
  startDate: Date; // The start date of this period for sorting
}

// Helper to get ISO week number
const getISOWeek = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const getMonthName = (monthNumber: number): string => {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[monthNumber -1] || "Unknown";
}

export const groupRunsByWeek = (runs: EnrichedRun[]): TimeGroupData[] => {
  const grouped: Record<string, TimeGroupData> = {};

  runs.forEach(run => {
    const localYear = parseInt(run.start_date_local.substring(0, 4), 10);
    const localMonth = parseInt(run.start_date_local.substring(5, 7), 10) - 1; // 0-11 for Date constructor
    const localDay = parseInt(run.start_date_local.substring(8, 10), 10);

    // Use UTC components of the local date to ensure getISOWeek works correctly
    const activityLocalDateAsUtc = new Date(Date.UTC(localYear, localMonth, localDay));
    const week = getISOWeek(activityLocalDateAsUtc);

    // Calculate weekStartDate based on the activity's local calendar date
    // This ensures that the week grouping is consistent with the local date
    const tempDateForWeekCalcs = new Date(localYear, localMonth, localDay);
    const dayOfWeek = tempDateForWeekCalcs.getDay(); // 0 (Sunday) - 6 (Saturday)
    // Adjust diff to get Monday. If Sunday (0), subtract 6 days. If Monday (1), subtract 0 days. If Tuesday (2), subtract 1 day, etc.
    const diffToMonday = (dayOfWeek === 0) ? 6 : (dayOfWeek - 1);
    const weekStartDate = new Date(tempDateForWeekCalcs.setDate(tempDateForWeekCalcs.getDate() - diffToMonday));
    weekStartDate.setHours(0, 0, 0, 0);

    const weekYear = weekStartDate.getFullYear(); // Year of the week (can differ from localYear for year-end weeks)
    const key = `${weekYear}-W${week}`;

    if (!grouped[key]) {
      grouped[key] = {
        label: `Week of ${weekStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        year: weekYear,
        period: week,
        totalDistance: 0,
        totalMovingTime: 0,
        runCount: 0,
        startDate: weekStartDate,
      };
    }
    grouped[key].totalDistance += run.distance;
    grouped[key].totalMovingTime += run.moving_time;
    grouped[key].runCount += 1;
  });

  return Object.values(grouped).sort((a,b) => a.startDate.getTime() - b.startDate.getTime());
};

export const groupRunsByMonth = (runs: EnrichedRun[]): TimeGroupData[] => {
  const grouped: Record<string, TimeGroupData> = {};

  runs.forEach(run => {
    // Parse year and month directly from the start_date_local string
    const year = parseInt(run.start_date_local.substring(0, 4), 10);
    const month = parseInt(run.start_date_local.substring(5, 7), 10); // month is 1-12
    const key = `${year}-M${month}`;

    if (!grouped[key]) {
      // Create the Date object for monthStartDate using the parsed year and month
      const monthStartDate = new Date(year, month - 1, 1); // month - 1 because Date constructor expects 0-11
      grouped[key] = {
        label: `${getMonthName(month)} ${year}`,
        year,
        period: month,
        totalDistance: 0,
        totalMovingTime: 0,
        runCount: 0,
        startDate: monthStartDate,
      };
    }
    grouped[key].totalDistance += run.distance;
    grouped[key].totalMovingTime += run.moving_time;
    grouped[key].runCount += 1;
  });
  return Object.values(grouped).sort((a,b) => a.startDate.getTime() - b.startDate.getTime());
};
