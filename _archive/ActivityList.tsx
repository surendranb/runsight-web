import React from 'react';
import { Calendar, Clock, MapPin, Zap } from 'lucide-react';
import { Activity } from '../types';

interface ActivityListProps {
  activities: Activity[];
}

export const ActivityList: React.FC<ActivityListProps> = ({ activities }) => {
  const formatDistance = (distance: number) => {
    return (distance / 1000).toFixed(2) + ' km';
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatPace = (distance: number, time: number) => {
    const paceMinutes = Math.floor((time / 60) / (distance / 1000));
    const paceSeconds = Math.floor(((time / 60) / (distance / 1000) - paceMinutes) * 60);
    return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/km`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900">Recent Runs</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {activities.slice(0, 10).map((activity) => (
          <div key={activity.id} className="p-6 hover:bg-gray-50 transition-colors duration-150">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 truncate flex-1 mr-4">
                {activity.name}
              </h3>
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="w-4 h-4 mr-1" />
                {formatDate(activity.start_date)}
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center text-gray-600">
                <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                <div>
                  <div className="font-medium">{formatDistance(activity.distance)}</div>
                  <div className="text-xs text-gray-500">Distance</div>
                </div>
              </div>
              
              <div className="flex items-center text-gray-600">
                <Clock className="w-4 h-4 mr-2 text-green-500" />
                <div>
                  <div className="font-medium">{formatTime(activity.moving_time)}</div>
                  <div className="text-xs text-gray-500">Time</div>
                </div>
              </div>
              
              <div className="flex items-center text-gray-600">
                <Zap className="w-4 h-4 mr-2 text-orange-500" />
                <div>
                  <div className="font-medium">{formatPace(activity.distance, activity.moving_time)}</div>
                  <div className="text-xs text-gray-500">Pace</div>
                </div>
              </div>
              
              {activity.total_elevation_gain > 0 && (
                <div className="flex items-center text-gray-600">
                  <div className="w-4 h-4 mr-2 flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-purple-500"></div>
                  </div>
                  <div>
                    <div className="font-medium">{Math.round(activity.total_elevation_gain)}m</div>
                    <div className="text-xs text-gray-500">Elevation</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};