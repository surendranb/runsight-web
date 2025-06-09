// src/components/NavigationBar.tsx
import React from 'react';

// Assuming 'View' type is defined in App.tsx or a shared types file.
// If not, it might need to be imported or redefined here.
// For now, let's assume it's a string type for simplicity in this isolated component.
type View = 'dashboard' | 'insights' | 'goals' | 'settings' | string; // Extend as needed

interface NavigationBarProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

interface NavItemProps {
  label: string;
  viewName: View;
  isActive: boolean;
  isDisabled?: boolean;
  onClick: (view: View) => void;
}

const NavItem: React.FC<NavItemProps> = ({ label, viewName, isActive, isDisabled, onClick }) => {
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
    <button
      onClick={() => !isDisabled && onClick(viewName)}
      className={classes}
      disabled={isDisabled}
      aria-current={isActive ? 'page' : undefined}
    >
      {label}
    </button>
  );
};

export const NavigationBar: React.FC<NavigationBarProps> = ({ currentView, onNavigate }) => {
  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side: App Name/Logo (Optional) */}
          <div className="flex-shrink-0">
            {/* Could be an image or text logo */}
            <span className="text-xl font-bold text-blue-600">RunSight</span>
          </div>

          {/* Center: Navigation Links */}
          <div className="flex items-center space-x-4">
            <NavItem
              label="Dashboard"
              viewName="dashboard"
              isActive={currentView === 'dashboard'}
              onClick={onNavigate}
            />
            <NavItem
              label="Insights"
              viewName="insights"
              isActive={currentView === 'insights'}
              onClick={onNavigate}
            />
            <NavItem
              label="Goal Tracking"
              viewName="goals" // Placeholder view name
              isActive={currentView === 'goals'}
              onClick={onNavigate}
              isDisabled={true}
            />
            <NavItem
              label="Settings"
              viewName="settings" // Placeholder view name
              isActive={currentView === 'settings'}
              onClick={onNavigate}
              isDisabled={true}
            />
          </div>

          {/* Right side: User menu/logout (Can be added from App.tsx or as a separate component) */}
          {/* For this component, we'll keep it focused on page navigation links */}
          <div className="w-auto flex-shrink-0"> {/* Placeholder for alignment */}
             {/* User info and logout button are currently in App.tsx's rendered components, not part of this nav bar directly */}
          </div>
        </div>
      </div>
    </nav>
  );
};
