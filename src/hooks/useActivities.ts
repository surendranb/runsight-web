import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, ActivityStats } from '../types';

export const useActivities = (userId: string | null) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchActivities();
  }, [userId]);

  const fetchActivities = async () => {
    try {
      // Fetch activities from database (no weather for now)
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'Run')
        .order('start_date', { ascending: false });

      if (activitiesError) {
        console.error('Database fetch failed:', activitiesError);
        setActivities([]);
        setStats(null);
      } else {
        console.log(`✅ Loaded ${activitiesData?.length || 0} activities from database`);
        setActivities(activitiesData || []);
        calculateStats(activitiesData || []);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (activities: Activity[]) => {
    if (activities.length === 0) {
      setStats(null);
      return;
    }

    const totalRuns = activities.length;
    const totalDistance = activities.reduce((sum, activity) => sum + activity.distance, 0);
    const totalTime = activities.reduce((sum, activity) => sum + activity.moving_time, 0);
    const totalElevation = activities.reduce((sum, activity) => sum + activity.total_elevation_gain, 0);
    
    const activitiesWithHeartRate = activities.filter(a => a.average_heartrate);
    const averageHeartRate = activitiesWithHeartRate.length > 0
      ? activitiesWithHeartRate.reduce((sum, a) => sum + (a.average_heartrate || 0), 0) / activitiesWithHeartRate.length
      : 0;

    const averagePace = totalDistance > 0 ? (totalTime / 60) / (totalDistance / 1000) : 0;
    const bestDistance = Math.max(...activities.map(a => a.distance));
    const bestTime = Math.max(...activities.map(a => a.moving_time));
    const bestPace = Math.min(...activities.map(a => a.moving_time / 60 / (a.distance / 1000)));

    setStats({
      totalRuns,
      totalDistance,
      totalTime,
      averagePace,
      totalElevation,
      averageHeartRate,
      bestDistance,
      bestTime,
      bestPace,
    });
  };

  return { activities, stats, loading, refetch: fetchActivities };
};