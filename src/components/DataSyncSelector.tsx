import React, { useState } from 'react';
import { Calendar, Clock, Database, Activity, Zap } from 'lucide-react';

interface DataSyncSelectorProps {
  accessToken: string;
  userId: string;
  onSyncComplete: (data: any) => void;
  onSkip: () => void;
}

interface SyncOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  days: number;
  estimatedActivities: string;
  estimatedTime: string;
}

const syncOptions: SyncOption[] = [
  {
    id: 'week',
    label: 'Last 7 Days',
    description: 'Quick test with recent activities',
    icon: <Zap className="w-5 h-5" />,
    days: 7,
    estimatedActivities: '1-3 runs',
    estimatedTime: '< 30 seconds'
  },
  {
    id: 'month',
    label: 'Last 30 Days',
    description: 'Recent month of training data',
    icon: <Calendar className="w-5 h-5" />,
    days: 30,
    estimatedActivities: '5-15 runs',
    estimatedTime: '1-2 minutes'
  },
  {
    id: 'quarter',
    label: 'Last 3 Months',
    description: 'Seasonal training patterns',
    icon: <Clock className="w-5 h-5" />,
    days: 90,
    estimatedActivities: '15-40 runs',
    estimatedTime: '3-5 minutes'
  },
  {
    id: 'year',
    label: 'Last 12 Months',
    description: 'Full year of running analytics',
    icon: <Database className="w-5 h-5" />,
    days: 365,
    estimatedActivities: '50-200 runs',
    estimatedTime: '5-15 minutes'
  },
  {
    id: 'all',
    label: 'All Time',
    description: 'Complete running history',
    icon: <Activity className="w-5 h-5" />,
    days: -1, // Special case for all time
    estimatedActivities: '100-1000+ runs',
    estimatedTime: '10-30 minutes'
  }
];

export const DataSyncSelector: React.FC<DataSyncSelectorProps> = ({ 
  accessToken, 
  userId, 
  onSyncComplete, 
  onSkip 
}) => {
  const [selectedOption, setSelectedOption] = useState<string>('month');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [syncData, setSyncData] = useState<any>(null);

  const startSync = async () => {
    const option = syncOptions.find(opt => opt.id === selectedOption);
    if (!option) return;

    setIsLoading(true);
    setProgress(0);
    setSyncData(null);

    try {
      setStatus('Calculating date range...');
      setProgress(10);

      // Calculate date range
      let startDate: Date;
      const endDate = new Date();

      if (option.days === -1) {
        // All time - start from a very early date
        startDate = new Date('2000-01-01');
      } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - option.days);
      }

      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);

      setStatus('Fetching activities from Strava...');
      setProgress(25);

      // Fetch activities with pagination
      let allActivities: any[] = [];
      let page = 1;
      const perPage = 50;

      while (true) {
        let url = `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`;
        
        // Add date filters if not all time
        if (option.days !== -1) {
          url += `&after=${startTimestamp}&before=${endTimestamp}`;
        }

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch activities: ${response.status}`);
        }

        const activities = await response.json();
        if (activities.length === 0) break;

        allActivities = [...allActivities, ...activities];
        page++;

        // Update progress
        setProgress(25 + (page * 2)); // Rough progress estimation
        setStatus(`Fetched ${allActivities.length} activities...`);

        // Break if we have enough or hit API limits
        if (activities.length < perPage) break;
        if (page > 50) break; // Safety limit
      }

      // Filter running activities
      const runningActivities = allActivities.filter(activity => 
        activity.type === 'Run' || activity.sport_type === 'Run'
      );

      setStatus(`Processing ${runningActivities.length} running activities...`);
      setProgress(50);

      // Process activities with weather data
      const processedActivities = [];
      const weatherData = [];

      for (let i = 0; i < runningActivities.length; i++) {
        const activity = runningActivities[i];
        
        setStatus(`Processing activity ${i + 1}/${runningActivities.length}: ${activity.name}`);
        setProgress(50 + ((i / runningActivities.length) * 40));

        // Process activity data
        const processedActivity = {
          strava_id: activity.id,
          user_id: userId,
          name: activity.name,
          distance: activity.distance,
          moving_time: activity.moving_time,
          elapsed_time: activity.elapsed_time,
          total_elevation_gain: activity.total_elevation_gain,
          type: activity.type,
          start_date: activity.start_date,
          start_date_local: activity.start_date_local,
          timezone: activity.timezone,
          utc_offset: activity.utc_offset,
          start_latlng: activity.start_latlng,
          end_latlng: activity.end_latlng,
          location_city: activity.location_city,
          location_state: activity.location_state,
          location_country: activity.location_country,
          achievement_count: activity.achievement_count,
          kudos_count: activity.kudos_count,
          comment_count: activity.comment_count,
          athlete_count: activity.athlete_count,
          photo_count: activity.photo_count,
          average_speed: activity.average_speed,
          max_speed: activity.max_speed,
          average_heartrate: activity.average_heartrate,
          max_heartrate: activity.max_heartrate,
          suffer_score: activity.suffer_score,
        };

        processedActivities.push(processedActivity);

        // Fetch weather data if coordinates available
        if (activity.start_latlng && activity.start_latlng.length === 2) {
          try {
            const [lat, lon] = activity.start_latlng;
            const activityDate = new Date(activity.start_date);
            const weatherTimestamp = Math.floor(activityDate.getTime() / 1000);

            const weatherResponse = await fetch(
              `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${weatherTimestamp}&appid=${import.meta.env.VITE_OPENWEATHER_API_KEY}&units=metric`
            );

            if (weatherResponse.ok) {
              const weatherApiData = await weatherResponse.json();
              const weather = weatherApiData.data[0];

              weatherData.push({
                activity_strava_id: activity.id,
                temperature: weather.temp,
                feels_like: weather.feels_like,
                humidity: weather.humidity,
                pressure: weather.pressure,
                visibility: weather.visibility,
                wind_speed: weather.wind_speed,
                wind_deg: weather.wind_deg,
                weather_main: weather.weather[0].main,
                weather_description: weather.weather[0].description,
                weather_icon: weather.weather[0].icon,
                clouds: weather.clouds,
              });
            }
          } catch (weatherError) {
            console.warn('Failed to fetch weather for activity:', activity.id, weatherError);
          }
        }

        // Small delay to avoid rate limiting
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setStatus('Sync complete!');
      setProgress(100);

      const syncResult = {
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days: option.days
        },
        summary: {
          totalActivities: allActivities.length,
          runningActivities: runningActivities.length,
          activitiesWithWeather: weatherData.length,
          activitiesWithCoordinates: runningActivities.filter(a => a.start_latlng).length,
          activitiesWithHeartRate: runningActivities.filter(a => a.average_heartrate).length,
        },
        activities: processedActivities,
        weather: weatherData,
        option: option
      };

      setSyncData(syncResult);
      
      // Store in localStorage for now (until RLS is fixed)
      localStorage.setItem('runsight_activities', JSON.stringify(processedActivities));
      localStorage.setItem('runsight_weather', JSON.stringify(weatherData));
      localStorage.setItem('runsight_sync_summary', JSON.stringify(syncResult.summary));

      setTimeout(() => {
        onSyncComplete(syncResult);
      }, 1500);

    } catch (error) {
      console.error('Sync error:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-full w-16 h-16 mx-auto mb-6">
              <Database className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Syncing Your Data</h2>
            
            <div className="mb-6">
              <div className="bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-gray-600 text-sm">{status}</p>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (syncData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-lg w-full mx-4">
          <div className="text-center">
            <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-6">
              <Database className="w-8 h-8 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Sync Complete!</h2>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-green-800 mb-2">📊 Import Summary</h3>
              <div className="space-y-1 text-sm text-green-700">
                <div>✅ {syncData.summary.runningActivities} running activities</div>
                <div>🌤️ {syncData.summary.activitiesWithWeather} with weather data</div>
                <div>📍 {syncData.summary.activitiesWithCoordinates} with GPS coordinates</div>
                <div>❤️ {syncData.summary.activitiesWithHeartRate} with heart rate data</div>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Ready to explore your running analytics!
            </p>
            
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">📊 Choose Your Data Sync Range</h1>
          <p className="text-gray-600 mb-6">
            Select how much of your running history you'd like to import and analyze.
          </p>
        </div>

        <div className="grid gap-4 mb-8">
          {syncOptions.map((option) => (
            <div
              key={option.id}
              onClick={() => setSelectedOption(option.id)}
              className={`
                p-6 rounded-xl border-2 cursor-pointer transition-all duration-200
                ${selectedOption === option.id 
                  ? 'border-blue-500 bg-blue-50 shadow-lg' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }
              `}
            >
              <div className="flex items-start gap-4">
                <div className={`
                  p-3 rounded-lg
                  ${selectedOption === option.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
                `}>
                  {option.icon}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{option.label}</h3>
                    {selectedOption === option.id && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mb-3">{option.description}</p>
                  
                  <div className="flex gap-6 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Est. Activities:</span> {option.estimatedActivities}
                    </div>
                    <div>
                      <span className="font-medium">Est. Time:</span> {option.estimatedTime}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={onSkip}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Skip for Now
          </button>
          <button
            onClick={startSync}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Database className="w-5 h-5" />
            Start Sync ({syncOptions.find(opt => opt.id === selectedOption)?.label})
          </button>
        </div>
      </div>
    </div>
  );
};