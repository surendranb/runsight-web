import React, { useState } from 'react';
import { Activity, Database, Eye, Calendar } from 'lucide-react';

interface DataTesterProps {
  accessToken: string;
  userId: string;
}

export const DataTester: React.FC<DataTesterProps> = ({ accessToken, userId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [testData, setTestData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOneWeekData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🧪 Starting 1-week data test...');
      
      // Calculate date range (last 7 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);
      
      console.log('📅 Date range:', {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        startTimestamp,
        endTimestamp
      });

      // Fetch activities from last week
      const activitiesResponse = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?after=${startTimestamp}&before=${endTimestamp}&per_page=10`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!activitiesResponse.ok) {
        throw new Error(`Failed to fetch activities: ${activitiesResponse.status}`);
      }

      const activities = await activitiesResponse.json();
      console.log('🏃 Raw activities from Strava:', activities);

      // Filter only running activities
      const runningActivities = activities.filter((activity: any) => 
        activity.type === 'Run' || activity.sport_type === 'Run'
      );

      console.log('🏃‍♂️ Running activities found:', runningActivities.length);

      if (runningActivities.length === 0) {
        setTestData({
          message: 'No running activities found in the last 7 days',
          dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
          totalActivities: activities.length,
          runningActivities: 0
        });
        return;
      }

      // Process first running activity as example
      const sampleActivity = runningActivities[0];
      console.log('📊 Processing sample activity:', sampleActivity);

      // Build the complete data structure
      const processedData = {
        user: {
          id: userId,
          strava_id: 20683290, // Your Strava ID
          first_name: 'Surendran',
          last_name: 'Balachandran'
        },
        activity: {
          // Database structure
          database_payload: {
            strava_id: sampleActivity.id,
            user_id: userId,
            name: sampleActivity.name,
            distance: sampleActivity.distance,
            moving_time: sampleActivity.moving_time,
            elapsed_time: sampleActivity.elapsed_time,
            total_elevation_gain: sampleActivity.total_elevation_gain,
            type: sampleActivity.type,
            start_date: sampleActivity.start_date,
            start_date_local: sampleActivity.start_date_local,
            timezone: sampleActivity.timezone,
            utc_offset: sampleActivity.utc_offset,
            start_latlng: sampleActivity.start_latlng,
            end_latlng: sampleActivity.end_latlng,
            location_city: sampleActivity.location_city,
            location_state: sampleActivity.location_state,
            location_country: sampleActivity.location_country,
            achievement_count: sampleActivity.achievement_count,
            kudos_count: sampleActivity.kudos_count,
            comment_count: sampleActivity.comment_count,
            athlete_count: sampleActivity.athlete_count,
            photo_count: sampleActivity.photo_count,
            average_speed: sampleActivity.average_speed,
            max_speed: sampleActivity.max_speed,
            average_heartrate: sampleActivity.average_heartrate,
            max_heartrate: sampleActivity.max_heartrate,
            suffer_score: sampleActivity.suffer_score,
          },
          // Human-readable format
          readable: {
            name: sampleActivity.name,
            date: new Date(sampleActivity.start_date_local).toLocaleDateString(),
            distance_km: (sampleActivity.distance / 1000).toFixed(2),
            duration: `${Math.floor(sampleActivity.moving_time / 60)}:${(sampleActivity.moving_time % 60).toString().padStart(2, '0')}`,
            pace_per_km: sampleActivity.distance > 0 ? 
              `${Math.floor((sampleActivity.moving_time / (sampleActivity.distance / 1000)) / 60)}:${Math.floor((sampleActivity.moving_time / (sampleActivity.distance / 1000)) % 60).toString().padStart(2, '0')}` : 'N/A',
            avg_heart_rate: sampleActivity.average_heartrate || 'N/A',
            elevation_gain: `${sampleActivity.total_elevation_gain}m`,
            location: [sampleActivity.location_city, sampleActivity.location_state, sampleActivity.location_country].filter(Boolean).join(', ') || 'Unknown'
          }
        },
        weather: null, // Will fetch if coordinates available
        summary: {
          total_activities_last_week: activities.length,
          running_activities_last_week: runningActivities.length,
          sample_activity_id: sampleActivity.id,
          has_coordinates: !!sampleActivity.start_latlng,
          has_heart_rate: !!sampleActivity.average_heartrate
        }
      };

      // Fetch weather if coordinates available
      if (sampleActivity.start_latlng && sampleActivity.start_latlng.length === 2) {
        console.log('🌤️ Fetching weather data...');
        
        const [lat, lon] = sampleActivity.start_latlng;
        const activityDate = new Date(sampleActivity.start_date);
        const weatherTimestamp = Math.floor(activityDate.getTime() / 1000);
        
        try {
          const weatherResponse = await fetch(
            `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${weatherTimestamp}&appid=${import.meta.env.VITE_OPENWEATHER_API_KEY}&units=metric`
          );

          if (weatherResponse.ok) {
            const weatherData = await weatherResponse.json();
            const weather = weatherData.data[0];
            
            processedData.weather = {
              database_payload: {
                activity_id: 'temp_activity_id',
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
              },
              readable: {
                temperature: `${weather.temp}°C`,
                feels_like: `${weather.feels_like}°C`,
                humidity: `${weather.humidity}%`,
                condition: weather.weather[0].main,
                description: weather.weather[0].description,
                wind: `${weather.wind_speed} m/s`,
                icon: weather.weather[0].icon
              }
            };
            
            console.log('🌤️ Weather data fetched successfully');
          } else {
            console.warn('Weather API failed:', weatherResponse.status);
          }
        } catch (weatherError) {
          console.warn('Weather fetch error:', weatherError);
        }
      }

      setTestData(processedData);
      console.log('✅ Complete processed data:', processedData);
      
    } catch (err) {
      console.error('❌ Test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">Data Structure Tester</h2>
      </div>

      <div className="mb-6">
        <button
          onClick={fetchOneWeekData}
          disabled={isLoading}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Testing...
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4" />
              Test 1 Week of Data
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">❌ Error: {error}</p>
        </div>
      )}

      {testData && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">📊 Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Total activities (7 days): <strong>{testData.summary?.total_activities_last_week}</strong></div>
              <div>Running activities: <strong>{testData.summary?.running_activities_last_week}</strong></div>
              <div>Has coordinates: <strong>{testData.summary?.has_coordinates ? '✅' : '❌'}</strong></div>
              <div>Has heart rate: <strong>{testData.summary?.has_heart_rate ? '✅' : '❌'}</strong></div>
            </div>
          </div>

          {testData.activity && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-3">🏃‍♂️ Sample Activity (Human Readable)</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Name:</strong> {testData.activity.readable.name}</div>
                <div><strong>Date:</strong> {testData.activity.readable.date}</div>
                <div><strong>Distance:</strong> {testData.activity.readable.distance_km} km</div>
                <div><strong>Duration:</strong> {testData.activity.readable.duration}</div>
                <div><strong>Pace:</strong> {testData.activity.readable.pace_per_km} /km</div>
                <div><strong>Heart Rate:</strong> {testData.activity.readable.avg_heart_rate} BPM</div>
                <div><strong>Elevation:</strong> {testData.activity.readable.elevation_gain}</div>
                <div><strong>Location:</strong> {testData.activity.readable.location}</div>
              </div>
            </div>
          )}

          {testData.weather && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-3">🌤️ Weather Data</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Temperature:</strong> {testData.weather.readable.temperature}</div>
                <div><strong>Feels Like:</strong> {testData.weather.readable.feels_like}</div>
                <div><strong>Humidity:</strong> {testData.weather.readable.humidity}</div>
                <div><strong>Condition:</strong> {testData.weather.readable.condition}</div>
                <div><strong>Description:</strong> {testData.weather.readable.description}</div>
                <div><strong>Wind:</strong> {testData.weather.readable.wind}</div>
              </div>
            </div>
          )}

          <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <summary className="cursor-pointer font-semibold text-gray-800 mb-2">
              <Eye className="inline w-4 h-4 mr-2" />
              View Raw Database Payloads
            </summary>
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Activity Database Payload:</h4>
                <pre className="bg-white p-3 rounded border text-xs overflow-auto">
                  {JSON.stringify(testData.activity?.database_payload, null, 2)}
                </pre>
              </div>
              {testData.weather && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Weather Database Payload:</h4>
                  <pre className="bg-white p-3 rounded border text-xs overflow-auto">
                    {JSON.stringify(testData.weather.database_payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};