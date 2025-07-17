// src/components/NavigationBar.tsx
import React, { useState } from 'react';
import { Menu, X, Activity, BarChart3, Target, Settings as SettingsIcon, RefreshCw } from 'lucide-react';

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
    { label: "Dashboard", viewName: "dashboard", icon: Activity, isDisabled: false },
    { label: "Insights", viewName: "insights", icon: BarChart3, isDisabled: false },
    { label: "Goals", viewName: "goals", icon: Target, isDisabled: false },
    { label: "Settings", viewName: "settings", icon: SettingsIcon, isDisabled: true },
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
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center ml-8 space-x-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentView === item.viewName;
                return (
                  <button
                    key={item.viewName}
                    onClick={() => !item.isDisabled && onNavigate(item.viewName)}
                    disabled={item.isDisabled}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      item.isDisabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <IconComponent className="w-4 h-4 mr-2" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right side: Sync Controls & User Menu */}
          <div className="flex items-center space-x-3">
            {/* Sync Controls - Hidden on mobile */}
            {onSyncData && (
              <div className="hidden sm:flex items-center space-x-2">
                <select
                  value={selectedSyncPeriod}
                  onChange={(e) => setSelectedSyncPeriod(e.target.value as SyncPeriod)}
                  disabled={isSyncing}
                  className="text-xs border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 transition-all duration-200"
                  style={{paddingRight: '2rem', paddingLeft: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', height: '2.25rem'}}
                >
                  {SYNC_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleSyncClick}
                  disabled={isSyncing}
                  className={`flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 h-9 ${
                    isSyncing
                      ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync'}
                </button>
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
                  <button
                    key={item.viewName}
                    onClick={() => {
                      if (!item.isDisabled) {
                        onNavigate(item.viewName);
                        setIsMobileMenuOpen(false);
                      }
                    }}
                    disabled={item.isDisabled}
                    className={`flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      item.isDisabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 mr-3" />
                    {item.label}
                  </button>
                );
              })}
              
              {/* Mobile Sync Controls */}
              {onSyncData && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="px-3 py-2">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Sync Period
                    </label>
                    <select
                      value={selectedSyncPeriod}
                      onChange={(e) => setSelectedSyncPeriod(e.target.value as SyncPeriod)}
                      disabled={isSyncing}
                      className="w-full text-sm border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                    >
                      {SYNC_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        handleSyncClick();
                        setIsMobileMenuOpen(false);
                      }}
                      disabled={isSyncing}
                      className={`w-full mt-2 flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isSyncing
                          ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Syncing...' : 'Start Sync'}
                    </button>
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

const SYNC_OPTIONS: { label: string; value: SyncPeriod }[] = [
  { label: "Last 14 Days", value: "14days" },
  { label: "Last 30 Days", value: "30days" },
  { label: "Last 60 Days", value: "60days" },
  { label: "Last 90 Days", value: "90days" },
  { label: "This Year", value: "thisYear" },
  { label: "Last Year", value: "lastYear" },
  { label: "All Time", value: "allTime" },
];
