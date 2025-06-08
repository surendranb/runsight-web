import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Database, Activity, Zap, History, RefreshCw } from 'lucide-react';
import { saveActivityToDatabase, getExistingActivitiesDateRange } from '../lib/strava';

interface DataSyncSelectorProps {
  accessToken: string;
  userId: string;
  onSyncComplete: (data: any) => void;
  onSkip: () => void;
  isFirstRun?: boolean;
}

interface SyncOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  days: number;
  estimatedActivities: string;
  estimatedTime: string;
  customYear?: number;
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
  onSkip,
  isFirstRun = true
}) => {
  const [selectedOption, setSelectedOption] = useState<string>('month');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [syncData, setSyncData] = useState<any>(null);
  const [existingData, setExistingData] = useState<{earliest: Date | null, latest: Date | null, count: number} | null>(null);
  const [showHistoricOptions, setShowHistoricOptions] = useState(false);

  // Load existing data on component mount
  useEffect(() => {
    const loadExistingData = async () => {
      if (!isFirstRun) {
        const data = await getExistingActivitiesDateRange(userId);
        setExistingData(data);
      }
    };
    loadExistingData();
  }, [userId, isFirstRun]);

  // Generate historic sync options based on existing data
  const getHistoricSyncOptions = (): SyncOption[] => {
    if (!existingData || !existingData.earliest) return [];

    const historicOptions: SyncOption[] = [];
    const earliestYear = existingData.earliest.getFullYear();
    const currentYear = new Date().getFullYear();

    // Add option to sync before earliest existing data
    if (earliestYear > 2009) { // Strava started in 2009
      historicOptions.push({
        id: 'before-existing',
        label: `Before ${earliestYear}`,
        description: `Sync activities before your earliest data (${existingData.earliest.toLocaleDateString()})`,
        icon: <History className="w-5 h-5" />,
        days: -2, // Special flag for "before existing"
        estimatedActivities: '10-100+ runs',
        estimatedTime: '5-20 minutes'
      });
    }

    // Add year-by-year options for gaps
    for (let year = earliestYear - 1; year >= Math.max(2009, currentYear - 10); year--) {
      historicOptions.push({
        id: `year-${year}`,
        label: `Year ${year}`,
        description: `Sync all activities from ${year}`,
        icon: <Calendar className="w-5 h-5" />,
        days: -3, // Special flag for specific year
        estimatedActivities: '20-100 runs',
        estimatedTime: '3-10 minutes',
        customYear: year
      });
    }

    return historicOptions;
  };

  const startSync = async () => {
    let option = syncOptions.find(opt => opt.id === selectedOption);
    
    // Check if it's a historic option
    if (!option && showHistoricOptions) {
      const historicOptions = getHistoricSyncOptions();
      option = historicOptions.find(opt => opt.id === selectedOption);
    }
    
    if (!option) return;

    setIsLoading(true);
    setProgress(0);
    setSyncData(null);

    try {
      setStatus('Calculating date range...');
      setProgress(10);

      // Calculate date range based on option type
      let startDate: Date;
      let endDate = new Date();

      if (option.days === -1) {
        // All time - start from a very early date
        startDate = new Date('2000-01-01');
      } else if (option.days === -2) {
        // Before existing data
        if (existingData?.earliest) {
          endDate = new Date(existingData.earliest);
          startDate = new Date('2009-01-01'); // Strava started in 2009
        } else {
          throw new Error('No existing data found for historic sync');
        }
      } else if (option.days === -3 && option.customYear) {
        // Specific year
        startDate = new Date(option.customYear, 0, 1);
        endDate = new Date(option.customYear, 11, 31);
      } else {
        // Regular relative date range
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

      // Process and save activities (no weather for now)
      const processedActivities = [];
      let savedCount = 0;

      for (let i = 0; i < runningActivities.length; i++) {
        const activity = runningActivities[i];
        
        setStatus(`Saving activity ${i + 1}/${runningActivities.length}: ${activity.name}`);
        setProgress(50 + ((i / runningActivities.length) * 45));

        try {
          // Save activity to database
          const savedActivity = await saveActivityToDatabase(activity, userId);
          processedActivities.push(savedActivity);
          savedCount++;
          
          console.log(`✅ Activity saved: ${activity.name}`);
        } catch (activityError) {
          console.error('Failed to save activity:', activity.id, activityError);
          // Continue with other activities
        }

        // Small delay to avoid rate limiting
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      setStatus(`Sync complete! Saved ${savedCount} activities to database.`);
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
          savedActivities: savedCount,
          activitiesWithCoordinates: runningActivities.filter(a => a.start_latlng).length,
          activitiesWithHeartRate: runningActivities.filter(a => a.average_heartrate).length,
        },
        activities: processedActivities,
        option: option
      };

      setSyncData(syncResult);

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
              <h3 className="font-semibold text-green-800 mb-2">📊 Database Import Summary</h3>
              <div className="space-y-1 text-sm text-green-700">
                <div>💾 {syncData.summary.savedActivities} activities saved to database</div>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {isFirstRun ? '🎉 Welcome to RunSight!' : '🔄 Sync New Activities'}
          </h1>
          <p className="text-gray-600 mb-6">
            {isFirstRun 
              ? 'Select how much of your running history you\'d like to import and analyze.'
              : 'Choose how far back to check for new activities since your last sync.'
            }
          </p>
        </div>

        {/* Show existing data summary for returning users */}
        {!isFirstRun && existingData && existingData.count > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">📊 Your Current Data</h3>
            <div className="space-y-1 text-sm text-blue-700">
              <div>🏃‍♂️ {existingData.count} activities in database</div>
              <div>📅 From {existingData.earliest?.toLocaleDateString()} to {existingData.latest?.toLocaleDateString()}</div>
            </div>
            
            {/* Historic sync options toggle */}
            <button
              onClick={() => setShowHistoricOptions(!showHistoricOptions)}
              className="mt-3 flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              <History className="w-4 h-4" />
              {showHistoricOptions ? 'Hide' : 'Show'} Historic Sync Options
            </button>
          </div>
        )}

        <div className="grid gap-4 mb-8">
          {/* Regular sync options */}
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
          
          {/* Historic sync options */}
          {showHistoricOptions && getHistoricSyncOptions().map((option) => (
            <div
              key={option.id}
              onClick={() => setSelectedOption(option.id)}
              className={`
                p-6 rounded-xl border-2 cursor-pointer transition-all duration-200
                ${selectedOption === option.id 
                  ? 'border-orange-500 bg-orange-50 shadow-lg' 
                  : 'border-orange-200 bg-orange-25 hover:border-orange-300 hover:shadow-md'
                }
              `}
            >
              <div className="flex items-start gap-4">
                <div className={`
                  p-3 rounded-lg
                  ${selectedOption === option.id ? 'bg-orange-100 text-orange-600' : 'bg-orange-50 text-orange-500'}
                `}>
                  {option.icon}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{option.label}</h3>
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium">HISTORIC</span>
                    {selectedOption === option.id && (
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
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
            Start Sync ({
              syncOptions.find(opt => opt.id === selectedOption)?.label || 
              getHistoricSyncOptions().find(opt => opt.id === selectedOption)?.label
            })
          </button>
        </div>
      </div>
    </div>
  );
};