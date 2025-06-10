// src/lib/insightsProcessor.ts

export interface Run {
  id: string; // DB UUID
  user_id: string;
  strava_id: number; // Strava Activity ID
  name: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  start_date: string; // ISO string (UTC)
  start_date_local: string; // ISO string (local time)
  average_speed: number; // m/s
  max_speed?: number; // m/s
  average_heartrate?: number | null;
  max_heartrate?: number | null;
  total_elevation_gain: number;
  weather_data?: {
    weather?: {
      id?: number;
      icon?: string;
      main?: string;
      description?: string;
    };
    humidity?: number;
    pressure?: number;
    wind_deg?: number;
    feels_like?: number;
    visibility?: number;
    wind_speed?: number;
    temperature?: number;
  };
  strava_data?: {
    // Assuming strava_id at the root of Run is the primary Strava activity ID
    // If strava_data also has an id, it should match.
    // For now, focusing on workout_type from strava_data
    workout_type?: string | null;
    [key: string]: any; // Allows flexibility for other strava_data properties
  };
}

export interface WeeklyProgress {
  weekStartDate: string; // e.g., "YYYY-MM-DD"
  totalDistance: number; // km
  runCount: number;
  // For Recharts: weekLabel can be used for display
  weekLabel?: string;
}

export interface MonthlyProgress {
  month: string; // e.g., "YYYY-MM"
  totalDistance: number; // km
  runCount: number;
  // For Recharts: monthLabel can be used for display
  monthLabel?: string;
}

export interface PaceByTempData {
  tempRange: string; // e.g., "15-20°C"
  averagePace: number | null; // min/km
  runCount: number;
}

const METERS_TO_KM = 1 / 1000;
const SECONDS_TO_MINUTES = 1 / 60;

/**
 * Calculates pace in minutes per kilometer.
 * @param average_speed Speed in meters per second.
 * @returns Pace in min/km, or null if speed is zero or invalid.
 */
export function calculatePaceMinPerKm(average_speed: number): number | null {
  if (average_speed <= 0) {
    return null;
  }
  return (1 / average_speed) * 1000 * SECONDS_TO_MINUTES;
}

/**
 * Gets the Monday of the week for a given date.
 * @param d Date object
 * @returns Date object representing Monday of that week.
 */
function getMonday(d: Date): Date {
  d = new Date(d); // Create a new Date object to avoid modifying the original
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust if day is Sunday (0) to show current week's Monday
  return new Date(d.setDate(diff));
}

/**
 * Formats a date object to "Month Day" (e.g., "Jan 15").
 */
function formatToMonthDay(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Processes runs to calculate weekly progress (total distance and run count).
 * @param runs Array of Run objects.
 * @returns Array of WeeklyProgress objects, sorted by week.
 */
export function getWeeklyProgress(runs: Run[]): WeeklyProgress[] {
  if (!runs || runs.length === 0) return [];

  const weeklyData: { [weekStart: string]: { totalDistance: number; runCount: number; weekEndDate: Date } } = {};

  runs.forEach(run => {
    const runDate = new Date(run.start_date_local);
    const monday = getMonday(runDate);
    const weekStartDateStr = monday.toISOString().split('T')[0];

    let weekEndDate = new Date(monday);
    weekEndDate.setDate(monday.getDate() + 6);


    if (!weeklyData[weekStartDateStr]) {
      weeklyData[weekStartDateStr] = { totalDistance: 0, runCount: 0, weekEndDate };
    }
    weeklyData[weekStartDateStr].totalDistance += run.distance * METERS_TO_KM;
    weeklyData[weekStartDateStr].runCount += 1;
  });

  return Object.entries(weeklyData)
    .map(([weekStartDate, data]) => ({
      weekStartDate,
      totalDistance: parseFloat(data.totalDistance.toFixed(2)),
      runCount: data.runCount,
      weekLabel: `${formatToMonthDay(new Date(weekStartDate))} - ${formatToMonthDay(data.weekEndDate)}`
    }))
    .sort((a, b) => new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime());
}

/**
 * Formats a "YYYY-MM" string to "Month YYYY" (e.g., "January 2023").
 */
function formatToMonthYear(monthStr: string): string {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Processes runs to calculate monthly progress (total distance and run count).
 * @param runs Array of Run objects.
 * @returns Array of MonthlyProgress objects, sorted by month.
 */
export function getMonthlyProgress(runs: Run[]): MonthlyProgress[] {
  if (!runs || runs.length === 0) return [];

  const monthlyData: { [month: string]: { totalDistance: number; runCount: number } } = {};

  runs.forEach(run => {
    const runDate = new Date(run.start_date_local);
    const monthStr = runDate.toISOString().substring(0, 7); // "YYYY-MM"

    if (!monthlyData[monthStr]) {
      monthlyData[monthStr] = { totalDistance: 0, runCount: 0 };
    }
    monthlyData[monthStr].totalDistance += run.distance * METERS_TO_KM;
    monthlyData[monthStr].runCount += 1;
  });

  return Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      totalDistance: parseFloat(data.totalDistance.toFixed(2)),
      runCount: data.runCount,
      monthLabel: formatToMonthYear(month),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

const TEMP_RANGES = [
  { label: "<5°C", min: -Infinity, max: 5 },
  { label: "5-10°C", min: 5, max: 10 },
  { label: "10-15°C", min: 10, max: 15 },
  { label: "15-20°C", min: 15, max: 20 },
  { label: "20-25°C", min: 20, max: 25 },
  { label: "25-30°C", min: 25, max: 30 },
  { label: ">30°C", min: 30, max: Infinity },
];

/**
 * Calculates average pace for different temperature ranges.
 * @param runs Array of Run objects.
 * @returns Array of PaceByTempData objects.
 */
export function getPaceByTemperature(runs: Run[]): PaceByTempData[] {
  if (!runs || runs.length === 0) return [];

  const paceByTemp: { [rangeLabel: string]: { totalPace: number; runCount: number } } = {};

  TEMP_RANGES.forEach(range => {
    paceByTemp[range.label] = { totalPace: 0, runCount: 0 };
  });

  runs.forEach(run => {
    if (run.weather_data?.temperature === undefined || run.weather_data.temperature === null) {
      return; // Skip if no temperature data
    }
    const temp = run.weather_data.temperature;
    const pace = calculatePaceMinPerKm(run.average_speed);
    if (pace === null) {
      return; // Skip if pace is invalid
    }

    for (const range of TEMP_RANGES) {
      // Ensure the run's temperature falls strictly within the range for non-boundary labels
      // For boundary labels like "<5°C" (max: 5) and ">30°C" (min: 30), use inclusive checks appropriately.
      if (range.min === -Infinity && temp < range.max) { // For "<X" ranges
        paceByTemp[range.label].totalPace += pace;
        paceByTemp[range.label].runCount += 1;
        break;
      } else if (range.max === Infinity && temp >= range.min) { // For ">X" ranges
         paceByTemp[range.label].totalPace += pace;
        paceByTemp[range.label].runCount += 1;
        break;
      } else if (temp >= range.min && temp < range.max) { // For "X-Y" ranges
        paceByTemp[range.label].totalPace += pace;
        paceByTemp[range.label].runCount += 1;
        break;
      }
    }
  });

  return TEMP_RANGES.map(range => {
    const data = paceByTemp[range.label];
    return {
      tempRange: range.label,
      averagePace: data.runCount > 0 ? parseFloat((data.totalPace / data.runCount).toFixed(2)) : null,
      runCount: data.runCount,
    };
  }); // Not filtering out empty ranges here, the component can decide to show them or not
}

// TODO: Add functions for other insights in future steps:
// - Pace vs. Humidity
// - Heart Rate vs. Temperature
// - Heart Rate vs. Humidity
// - Pace vs. Wind Speed
// - Performance by Workout Type
// - Pace vs. Elevation Gain per km
// - Heart Rate vs. Elevation Gain per km
// - Pace/HR by Time of Day
