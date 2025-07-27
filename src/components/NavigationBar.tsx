// src/components/NavigationBar.tsx
import React, { useState } from 'react';
import { Menu, X, Activity, BarChart3, Target, Settings as SettingsIcon, RefreshCw, HelpCircle } from 'lucide-react';

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
  const [selectedSyncPeriod, setSelectedSyncPeriod] = useState<SyncPeriod>("30days");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSyncClick = () => {
    if (onSyncData) {
      onSyncData(selectedSyncPeriod);
    }
  };

  const navItems = [
    { 
      label: "Performance Dashboard", 
      shortLabel: "Dashboard",
      viewName: "dashboard", 
      icon: Activity, 
      isDisabled: false,
      description: "View your key running metrics, pace trends, and recent activities",
      value: "KPIs, trends, recent runs"
    },
    { 
      label: "Advanced Analytics", 
      shortLabel: "Insights",
      viewName: "insights", 
      icon: BarChart3, 
      isDisabled: false,
      description: "Deep dive into weather impact, consistency patterns, and performance optimization",
      value: "10+ detailed insights"
    },
    { 
      label: "Training Goals", 
      shortLabel: "Goals",
      viewName: "goals", 
      icon: Target, 
      isDisabled: false,
      description: "Set and track your running goals, milestones, and training targets",
      value: "Goal tracking & progress"
    },
    { 
      label: "App Settings", 
      shortLabel: "Settings",
      viewName: "settings", 
      icon: SettingsIcon, 
      isDisabled: true,
      description: "Configure preferences, data sync, and account settings",
      value: "Coming soon"
    },
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side: App Name & Desktop Navigation */}
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              <Activity className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-blue-600">RunSight</span>
            </div>
            
            {/* Desktop Navigation with Enhanced Information Scent */}
            <div className="hidden md:flex items-center ml-8 space-x-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentView === item.viewName;
                return (
                  <div key={item.viewName} className="relative group">
                    <button
                      onClick={() => !item.isDisabled && onNavigate(item.viewName)}
                      disabled={item.isDisabled}
                      className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        item.isDisabled
                          ? 'text-gray-400 cursor-not-allowed'
                          : isActive
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                      aria-describedby={`tooltip-${item.viewName}`}
                    >
                      <IconComponent className="w-4 h-4 mr-2" />
                      <span className="hidden lg:inline">{item.label}</span>
                      <span className="lg:hidden">{item.shortLabel}</span>
                      {!item.isDisabled && (
                        <div className="ml-2 flex items-center">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            isActive 
                              ? 'bg-blue-500 text-blue-100' 
                              : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-700'
                          }`}>
                            {item.value}
                          </span>
                        </div>
                      )}
                    </button>
                    
                    {/* Enhanced Tooltip with Information Scent */}
                    <div 
                      id={`tooltip-${item.viewName}`}
                      className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50"
                    >
                      <div className="font-semibold mb-1">{item.label}</div>
                      <div className="text-gray-300 mb-2">{item.description}</div>
                      <div className="text-blue-300 font-medium">Contains: {item.value}</div>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right side: Sync Controls & User Menu */}
          <div className="flex items-center space-x-3">
            {/* Enhanced Sync Controls with Information Scent */}
            {onSyncData && (
              <div className="hidden sm:flex items-center space-x-2">
                <div className="relative group">
                  <label className="sr-only">Select data sync period</label>
                  <select
                    value={selectedSyncPeriod}
                    onChange={(e) => setSelectedSyncPeriod(e.target.value as SyncPeriod)}
                    disabled={isSyncing}
                    className="text-xs border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 transition-all duration-200 pr-8 pl-3 py-2 h-9"
                    title="Choose how much historical data to sync from Strava"
                  >
                    {SYNC_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label} - {option.description}
                      </option>
                    ))}
                  </select>
                  
                  {/* Sync period tooltip */}
                  <div className="absolute top-full left-0 mt-1 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                    <div className="font-semibold mb-1">Data Sync Period</div>
                    <div className="text-gray-300">
                      {SYNC_OPTIONS.find(opt => opt.value === selectedSyncPeriod)?.description}
                    </div>
                  </div>
                </div>
                
                <div className="relative group">
                  <button
                    onClick={handleSyncClick}
                    disabled={isSyncing}
                    className={`flex items-center px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 h-9 ${
                      isSyncing
                        ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
                    }`}
                    title={isSyncing ? 'Syncing data from Strava...' : 'Sync latest runs from Strava'}
                  >
                    <RefreshCw className={`w-3 h-3 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing Data...' : 'Sync from Strava'}
                  </button>
                  
                  {/* Sync button tooltip */}
                  {!isSyncing && (
                    <div className="absolute top-full right-0 mt-1 w-44 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                      <div className="font-semibold mb-1">Sync Latest Data</div>
                      <div className="text-gray-300">
                        Fetch your latest runs and update insights
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* User Info - Hidden on small screens */}
            {userName && (
              <span className="hidden lg:inline text-sm text-gray-700 font-medium">
                Hi, {userName.split(' ')[0]}
              </span>
            )}

            {/* Logout Button - Hidden on mobile */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="hidden sm:flex items-center px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
              >
                Logout
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors duration-200"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentView === item.viewName;
                return (
                  <div key={item.viewName} className="space-y-1">
                    <button
                      onClick={() => {
                        if (!item.isDisabled) {
                          onNavigate(item.viewName);
                          setIsMobileMenuOpen(false);
                        }
                      }}
                      disabled={item.isDisabled}
                      className={`flex items-center justify-between w-full px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        item.isDisabled
                          ? 'text-gray-400 cursor-not-allowed'
                          : isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      <div className="flex items-center">
                        <IconComponent className="w-4 h-4 mr-3" />
                        <div className="text-left">
                          <div className="font-medium">{item.label}</div>
                          <div className={`text-xs ${
                            isActive ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {item.description}
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        isActive 
                          ? 'bg-blue-500 text-blue-100' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {item.value}
                      </span>
                    </button>
                  </div>
                );
              })}
              
              {/* Enhanced Mobile Sync Controls */}
              {onSyncData && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="px-3 py-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Sync from Strava
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      Choose how much historical data to sync and analyze
                    </p>
                    <select
                      value={selectedSyncPeriod}
                      onChange={(e) => setSelectedSyncPeriod(e.target.value as SyncPeriod)}
                      disabled={isSyncing}
                      className="w-full text-sm border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 py-2 px-3"
                    >
                      {SYNC_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label} - {option.description}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        handleSyncClick();
                        setIsMobileMenuOpen(false);
                      }}
                      disabled={isSyncing}
                      className={`w-full mt-3 flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isSyncing
                          ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                          : 'bg-green-500 hover:bg-green-600 text-white shadow-md'
                      }`}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Syncing Data from Strava...' : 'Sync Latest Runs'}
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      {isSyncing ? 'Fetching and analyzing your runs...' : 'Get your latest activities and insights'}
                    </p>
                  </div>
                </div>
              )}

              {/* Mobile User Info & Logout */}
              <div className="pt-3 border-t border-gray-200">
                {userName && (
                  <div className="px-3 py-2 text-sm text-gray-700">
                    Logged in as <span className="font-medium">{userName}</span>
                  </div>
                )}
                {onLogout && (
                  <button
                    onClick={() => {
                      onLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
                  >
                    Logout
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

const SYNC_OPTIONS: { label: string; value: SyncPeriod; description: string }[] = [
  { label: "Last 14 Days", value: "14days", description: "Recent performance focus" },
  { label: "Last 30 Days", value: "30days", description: "Monthly training analysis" },
  { label: "Last 60 Days", value: "60days", description: "Extended trend analysis" },
  { label: "Last 90 Days", value: "90days", description: "Quarterly performance review" },
  { label: "This Year", value: "thisYear", description: "Annual progress tracking" },
  { label: "Last Year", value: "lastYear", description: "Historical comparison" },
  { label: "All Time", value: "allTime", description: "Complete running history" },
];
