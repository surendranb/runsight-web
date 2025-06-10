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
    const date = new Date(run.start_date_local);
    const year = date.getFullYear();
    const week = getISOWeek(date);
    const key = `${year}-W${week}`;

    if (!grouped[key]) {
      const weekStartDate = new Date(date);
      weekStartDate.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1)); // Monday of the week
      weekStartDate.setHours(0,0,0,0);

      grouped[key] = {
        label: `Week of ${weekStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        year,
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
    const date = new Date(run.start_date_local);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12
    const key = `${year}-M${month}`;

    if (!grouped[key]) {
      const monthStartDate = new Date(year, month - 1, 1);
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
