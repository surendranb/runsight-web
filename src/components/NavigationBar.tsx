// src/components/NavigationBar.tsx
import React, { useState } from 'react'; // Added useState

type View = 'dashboard' | 'insights' | 'goals' | 'settings' | string;

// Update SyncPeriod type to include specific string literals
export type SyncPeriod = "14days" | "30days" | "60days" | "90days" | "thisYear" | "lastYear" | "allTime";

interface NavigationBarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  userName?: string;
  onLogout?: () => void;
  onSyncData?: (period: SyncPeriod) => void; // Modified to pass SyncPeriod
  isSyncing?: boolean;
}

// ... (NavItem component remains the same)
const NavItem: React.FC<any> = ({ label, viewName, isActive, isDisabled, onClick }) => {
  const activeClasses = "bg-blue-600 text-white";
  const inactiveClasses = "text-gray-700 hover:bg-blue-500 hover:text-white";
  const disabledClasses = "text-gray-400 cursor-not-allowed";

  let classes = "px-3 py-2 rounded-md text-sm font-medium transition-colors";
  if (isDisabled) {
    classes += ` ${disabledClasses}`;
  } else if (isActive) {
    classes += ` ${activeClasses}`;
  } else {
    classes += ` ${inactiveClasses}`;
  }
  return (
    <button onClick={() => !isDisabled && onClick(viewName)} className={classes} disabled={isDisabled} aria-current={isActive ? 'page' : undefined}>
      {label}
    </button>
  );
};


export const NavigationBar: React.FC<NavigationBarProps> = ({
    currentView,
    onNavigate,
    userName,
    onLogout,
    onSyncData,
    isSyncing
}) => {
  const [selectedSyncPeriod, setSelectedSyncPeriod] = useState<SyncPeriod>("30days"); // Default to "30days"

  const handleSyncClick = () => {
    if (onSyncData) {
      onSyncData(selectedSyncPeriod);
    }
  };

  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side: App Name & Main Navigation */}
          <div className="flex items-center">
            <span className="text-xl font-bold text-blue-600 mr-6">RunSight</span>
            <div className="hidden md:flex items-baseline space-x-4"> {/* Links hidden on small screens, shown on md+ */}
                <NavItem label="Dashboard" viewName="dashboard" isActive={currentView === 'dashboard'} onClick={onNavigate} />
                <NavItem label="Insights" viewName="insights" isActive={currentView === 'insights'} onClick={onNavigate} />
                <NavItem label="Goal Tracking" viewName="goals" isActive={currentView === 'goals'} onClick={onNavigate} isDisabled={true} />
                <NavItem label="Settings" viewName="settings" isActive={currentView === 'settings'} onClick={onNavigate} isDisabled={true} />
            </div>
          </div>

          {/* Right side: Sync, User Info, Logout */}
          <div className="flex items-center space-x-3">
            {onSyncData && ( // Only show sync options if onSyncData is provided
              <div className="flex items-center space-x-2">
                <select
                  value={selectedSyncPeriod}
                  onChange={(e) => setSelectedSyncPeriod(e.target.value as SyncPeriod)}
                  disabled={isSyncing}
                  className="text-xs border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:bg-gray-100"
                  style={{paddingRight: '2rem', paddingLeft: '0.5rem', paddingTop: '0.4rem', paddingBottom: '0.4rem', height: '2.125rem' }} // Adjusted padding for aesthetics
                >
                  {SYNC_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button
                    onClick={handleSyncClick}
                    disabled={isSyncing}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors h-[2.125rem] ${ // Matched height
                        isSyncing
                        ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                >
                    {isSyncing ? '🔄 Syncing...' : 'Start Sync'}
                </button>
              </div>
            )}
            {userName && <span className="hidden md:inline text-sm text-gray-700">Hi, {userName.split(' ')[0]}</span>}
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-3 py-2 rounded-md text-sm font-medium text-red-500 hover:bg-red-100 transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const SYNC_OPTIONS: { label: string; value: SyncPeriod }[] = [
  { label: "Last 14 Days", value: "14days" },
  { label: "Last 30 Days", value: "30days" },
  { label: "Last 60 Days", value: "60days" },
  { label: "Last 90 Days", value: "90days" },
  { label: "This Year", value: "thisYear" },
  { label: "Last Year", value: "lastYear" },
  { label: "All Time", value: "allTime" },
];
