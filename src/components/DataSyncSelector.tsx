import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Database, Activity, Zap, History } from 'lucide-react'; // RefreshCw removed as historic options will be commented out
import { processAndSaveActivity } from '../lib/activityProcessor';
import { supabase } from '../lib/supabase'; // Adjust path as needed
// import { getExistingActivitiesDateRange } from '../lib/strava'; // To be commented out

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
  // const [existingData, setExistingData] = useState<{earliest: Date | null, latest: Date | null, count: number} | null>(null); // Commented out
  // const [showHistoricOptions, setShowHistoricOptions] = useState(false); // Commented out
  const [hasNavigated, setHasNavigated] = useState(false);

  // Load existing data on component mount - COMMENTED OUT FOR SIMPLIFICATION
  // useEffect(() => {
  //   const loadExistingData = async () => {
  //     if (!isFirstRun) {
  //       // const data = await getExistingActivitiesDateRange(userId); // Functionality to be simplified
  //       // setExistingData(data);
  //     }
  //   };
  //   loadExistingData();
  // }, [userId, isFirstRun]);

  // Generate historic sync options based on existing data - COMMENTED OUT FOR SIMPLIFICATION
  // const getHistoricSyncOptions = (): SyncOption[] => {
  //   // if (!existingData || !existingData.earliest) return [];
  //   // const historicOptions: SyncOption[] = [];
  //   // const earliestYear = existingData.earliest.getFullYear();
  //   // const currentYear = new Date().getFullYear();
  //   // ... (rest of the logic)
  //   return []; // Return empty array as it's not used now
  // };

  const testMinimalInsert = async () => {
    // Use a known, valid user_id from your auth.users table.
    // For testing, you might need to hardcode one that you know exists,
    // or dynamically get the current logged-in user's ID if available here.
    // Assuming `userId` prop is available and is the correct auth.users UUID.
    if (!userId) {
      alert('User ID is not available for the test insert.');
      console.error('[MinimalTest] User ID not available.');
      return;
    }

    const testData = {
      user_id: userId, // Use the actual logged-in user's ID
      strava_id: Math.floor(Math.random() * 1000000000) + 100000000, // Random Strava ID for testing
      name: 'Minimal Test Run - ' + new Date().toISOString(),
      distance: 1000.0, // real
      moving_time: 300,  // integer
      elapsed_time: 310, // integer
      type: 'Run',       // text, matches CHECK constraint
      start_date: new Date().toISOString(), // timestamp with time zone
      start_date_local: new Date().toISOString(), // timestamp with time zone
      // Omitting all other nullable fields to keep it minimal
      // Ensure all NOT NULL fields (without defaults) are included if any exist beyond this list
    };

    console.log('[MinimalTest] Attempting insert with data:', JSON.stringify(testData, null, 2));
    alert('[MinimalTest] Check console: Attempting insert...');

    try {
      const { data, error, status, statusText } = await supabase
        .from('enriched_runs')
        .insert(testData)
        .select(); // .select() is important to get detailed error or the inserted data back

      if (error) {
        console.error('[MinimalTest] Supabase insert error object:', JSON.stringify(error, null, 2));
        console.error(`[MinimalTest] Supabase insert error: Code: ${error.code}, Message: ${error.message}, Details: ${error.details}, Hint: ${error.hint}`);
        alert(`Minimal test insert FAILED. Code: ${error.code}. Message: ${error.message}. Check console for full error.`);
      } else {
        console.log('[MinimalTest] Supabase insert success. Status:', status, statusText);
        console.log('[MinimalTest] Supabase insert success. Returned data:', JSON.stringify(data, null, 2));
        alert('Minimal test insert SUCCEEDED. Check database and console.');
      }
    } catch (e: any) {
      // This outer catch is for errors not originating from Supabase client's structured error object
      console.error('[MinimalTest] Outer catch - An unexpected error occurred:', JSON.stringify(e, null, 2));
      let errorMessage = 'Unknown error';
      if (e instanceof Error) {
          errorMessage = e.message;
      } else if (typeof e === 'string') {
          errorMessage = e;
      } else if (e && typeof e.message === 'string') {
          errorMessage = e.message;
      }
      alert(`Minimal test insert FAILED (outer catch). Error: ${errorMessage}. Check console.`);
    }
  };

  const startSync = async () => {
    let option = syncOptions.find(opt => opt.id === selectedOption);
    
    // Check if it's a historic option - COMMENTED OUT FOR SIMPLIFICATION
    // if (!option && showHistoricOptions) {
    //   const historicOptions = getHistoricSyncOptions();
    //   option = historicOptions.find(opt => opt.id === selectedOption);
    // }
    
    if (!option) {
      // If historic options are disabled, and no regular option found, it's an issue.
      // Default to a safe option or throw error. For now, just return.
      console.error("Selected sync option not found or historic options disabled.");
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setSyncData(null);

    try {
      setStatus('Calculating date range...');
      setProgress(10);

      // Calculate date range based on option type
      let startDate: Date;
      let endDate = new Date(); // Used if option.days !== -1

      if (option.days === -1) { // All time
        startDate = new Date('2000-01-01'); // Strava's earliest possible data
      } else { // Regular relative date range (historic options are disabled for now)
        startDate = new Date();
        startDate.setDate(startDate.getDate() - option.days);
      }

      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      // For "All time" or specific day ranges, endTimestamp isn't strictly needed by Strava API if `after` is used.
      // However, if you want to cap "All time" to 'today' for the loop logic:
      const endTimestamp = Math.floor(new Date().getTime() / 1000);


      setStatus('Fetching activities from Strava...');
      setProgress(25);

      // Fetch activities with pagination
      let allActivities: any[] = [];
      let page = 1;
      const perPage = 50;

      while (true) {
        let url = `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`;
        
        // Add date filters. `after` is primary. `before` can cap it.
        // For "All Time", we don't strictly need `before`, but it can be used to limit to "today".
        // For specific ranges (e.g. "Last 7 days"), `before` ensures we don't get activities newer than "now" if the job runs for a while.
        url += `&after=${startTimestamp}`;
        if (option.days !== -1) { // If not "All time", set an end cap.
          url += `&before=${endTimestamp}`;
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
        const activity = runningActivities[i]; // This is a StravaSummaryActivity
        
        setStatus(`Processing activity ${i + 1}/${runningActivities.length}: ${activity.name}`);
        setProgress(50 + Math.round(((i + 1) / runningActivities.length) * 45));

        try {
          console.log(`[DataSyncSelector] Processing activity: ${activity.name} (Strava ID: ${activity.id})`);
          // Ensure activity.id is a number if processAndSaveActivity expects number
          const result = await processAndSaveActivity(Number(activity.id), userId, accessToken);
          
          if (result.enrichedRunId) {
            processedActivities.push({
              id: result.enrichedRunId,
              name: activity.name,
              strava_id: activity.id,
              wasSkipped: result.wasSkipped // Capture this for summary
            });
            if (!result.wasSkipped) { // Only count if it's a truly new save
                savedCount++;
                console.log(`✅ Successfully processed and NEWLY SAVED: ${activity.name} (Enriched ID: ${result.enrichedRunId})`);
            } else {
                console.log(`⏭️ Activity already processed (SKIPPED): ${activity.name} (Enriched ID: ${result.enrichedRunId})`);
            }
          } else {
            console.error(`[DataSyncSelector] Failed to process activity ${activity.id} (${activity.name}):`, result.error);
            // Optionally, add to a list of failed activities to show to the user
          }
        } catch (activityError) {
          console.error(`[DataSyncSelector] Critical error during processing of activity ${activity.id} (${activity.name}):`, activityError);
        }

        // Small delay to avoid potential rate limiting on services called by processAndSaveActivity
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

      // Auto-navigate after 3 seconds, but user can click button immediately
      setTimeout(() => {
        if (!hasNavigated) {
          setHasNavigated(true);
          onSyncComplete(syncResult);
        }
      }, 3000);

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
            
            <p className="text-gray-600 mb-4">
              Ready to explore your running analytics!
            </p>
            
            <p className="text-gray-500 text-sm mb-6">
              Redirecting to dashboard in 3 seconds...
            </p>
            
            <button
              onClick={() => {
                if (!hasNavigated) {
                  setHasNavigated(true);
                  onSyncComplete(syncData);
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
            >
              <Activity className="w-5 h-5" />
              Continue to Dashboard
            </button>
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
              {/* <div>🏃‍♂️ {existingData.count} activities in database</div> */}
              {/* <div>📅 From {existingData.earliest?.toLocaleDateString()} to {existingData.latest?.toLocaleDateString()}</div> */}
              <div>Review sync options below.</div>
            </div>
            
            {/* Historic sync options toggle - COMMENTED OUT */}
            {/* <button
              onClick={() => setShowHistoricOptions(!showHistoricOptions)}
              className="mt-3 flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              <History className="w-4 h-4" />
              {showHistoricOptions ? 'Hide' : 'Show'} Historic Sync Options
            </button> */}
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
          
          {/* Historic sync options - COMMENTED OUT */}
          {/* {showHistoricOptions && getHistoricSyncOptions().map((option) => (
            // ... historic option rendering ...
          ))} */}
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

        {/* Debug Tools Section */}
        <div style={{ marginTop: '20px', padding: '10px', border: '1px solid red', textAlign: 'center' }}>
          <h4 style={{ color: 'red', fontWeight: 'bold', marginBottom: '10px' }}>Debug Tools</h4>
          <button
            onClick={testMinimalInsert}
            style={{
              backgroundColor: 'orange',
              color: 'white',
              padding: '10px 15px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Test Minimal Insert into enriched_runs
          </button>
        </div>
      </div>
    </div>
  );
};