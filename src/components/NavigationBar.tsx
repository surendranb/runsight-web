// src/components/NavigationBar.tsx
import React from 'react';

type View = 'dashboard' | 'insights' | 'goals' | 'settings' | string;

interface NavigationBarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  userName?: string; // Optional: for displaying user name
  onLogout?: () => void; // Optional: for logout button
  onSyncData?: () => void; // Optional: for sync button
  isSyncing?: boolean; // Optional: for sync button state
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
  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <span className="text-xl font-bold text-blue-600 mr-6">RunSight</span>
            <div className="flex items-baseline space-x-4">
                <NavItem label="Dashboard" viewName="dashboard" isActive={currentView === 'dashboard'} onClick={onNavigate} />
                <NavItem label="Insights" viewName="insights" isActive={currentView === 'insights'} onClick={onNavigate} />
                <NavItem label="Goal Tracking" viewName="goals" isActive={currentView === 'goals'} onClick={onNavigate} isDisabled={true} />
                <NavItem label="Settings" viewName="settings" isActive={currentView === 'settings'} onClick={onNavigate} isDisabled={true} />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {onSyncData && (
                <button
                    onClick={onSyncData}
                    disabled={isSyncing}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isSyncing
                        ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                >
                    {isSyncing ? '🔄 Syncing...' : '🔄 Sync New Data'}
                </button>
            )}
            {userName && <span className="text-sm text-gray-700">Hi, {userName.split(' ')[0]}</span>}
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
