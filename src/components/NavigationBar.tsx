// src/components/NavigationBar.tsx
import React, { useState } from 'react';
import { Menu, X, Activity, BarChart3, Target, Settings as SettingsIcon, RefreshCw, HelpCircle } from 'lucide-react';
import { StandardDropdown } from './common/StandardButton';

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

  // Simplified navigation following Gmail/LinkedIn patterns
  const navItems = [
    { 
      label: "Dashboard",
      viewName: "dashboard", 
      icon: Activity, 
      isDisabled: false
    },
    { 
      label: "Insights",
      viewName: "insights", 
      icon: BarChart3, 
      isDisabled: false
    },
    { 
      label: "Goals",
      viewName: "goals", 
      icon: Target, 
      isDisabled: false
    },
    { 
      label: "Settings",
      viewName: "settings", 
      icon: SettingsIcon, 
      isDisabled: true
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
            
            {/* Clean Desktop Navigation - Gmail/LinkedIn Style */}
            <div className="hidden md:flex items-center ml-8 space-x-2">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentView === item.viewName;
                return (
                  <button
                    key={item.viewName}
                    onClick={() => !item.isDisabled && onNavigate(item.viewName)}
                    disabled={item.isDisabled}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      item.isDisabled
                        ? 'text-gray-400 cursor-not-allowed opacity-50'
                        : isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                    title={item.isDisabled ? 'Coming soon' : `Go to ${item.label}`}
                  >
                    <IconComponent className="w-4 h-4 mr-2" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right side: Sync Controls & User Menu */}
          <div className="flex items-center space-x-3">
            {/* Standardized Sync Controls */}
            {onSyncData && (
              <div className="hidden sm:flex items-center space-x-3 bg-gray-50 rounded-lg p-1">
                <StandardDropdown
                  options={SYNC_OPTIONS}
                  value={selectedSyncPeriod}
                  onChange={(value) => setSelectedSyncPeriod(value as SyncPeriod)}
                  disabled={isSyncing}
                  size="sm"
                  className="min-w-32"
                />
                
                <button
                  onClick={handleSyncClick}
                  disabled={isSyncing}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    isSyncing
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                  }`}
                  title={isSyncing ? 'Syncing...' : 'Sync from Strava'}
                >
                  <RefreshCw className={`w-4 h-4 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing' : 'Sync'}
                </button>
              </div>
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
                    className={`flex items-center w-full px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      item.isDisabled
                        ? 'text-gray-400 cursor-not-allowed opacity-50'
                        : isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <IconComponent className="w-5 h-5 mr-3" />
                    <span>{item.label}</span>
                    {item.isDisabled && (
                      <span className="ml-auto text-xs text-gray-400">Soon</span>
                    )}
                  </button>
                );
              })}
              
              {/* Mobile Sync Controls */}
              {onSyncData && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="px-3 py-2">
                    <div className="flex items-center space-x-2 mb-3">
                      <StandardDropdown
                        options={SYNC_OPTIONS}
                        value={selectedSyncPeriod}
                        onChange={(value) => setSelectedSyncPeriod(value as SyncPeriod)}
                        disabled={isSyncing}
                        size="md"
                        className="flex-1"
                      />
                      <button
                        onClick={() => {
                          handleSyncClick();
                          setIsMobileMenuOpen(false);
                        }}
                        disabled={isSyncing}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isSyncing
                            ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        <RefreshCw className={`w-4 h-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Syncing' : 'Sync'}
                      </button>
                    </div>
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

const SYNC_OPTIONS = [
  { label: "Last 14 Days", value: "14days" },
  { label: "Last 30 Days", value: "30days" },
  { label: "Last 60 Days", value: "60days" },
  { label: "Last 90 Days", value: "90days" },
  { label: "This Year", value: "thisYear" },
  { label: "Last Year", value: "lastYear" },
  { label: "All Time", value: "allTime" },
];
