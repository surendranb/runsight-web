import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { standardTimePeriods } from '../../lib/chartTheme';

export type TimePeriod = keyof typeof standardTimePeriods;

interface TimePeriodSelectorProps {
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  availablePeriods?: TimePeriod[];
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Default periods following conventional web patterns
const defaultPeriods: TimePeriod[] = ['last7', 'last30', 'last90', 'thisYear', 'allTime'];

export const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
  availablePeriods = defaultPeriods,
  className = '',
  showIcon = true,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <select
        value={selectedPeriod}
        onChange={(e) => onPeriodChange(e.target.value as TimePeriod)}
        className={`
          ${sizeClasses[size]}
          ${showIcon ? 'pl-8' : ''}
          pr-8
          border border-gray-300 rounded-lg bg-white
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          hover:border-gray-400 transition-colors
          appearance-none cursor-pointer
          font-medium text-gray-700
        `}
        aria-label="Select time period"
      >
        {availablePeriods.map((period) => (
          <option key={period} value={period}>
            {standardTimePeriods[period]}
          </option>
        ))}
      </select>
      
      {/* Icon and chevron */}
      <div className="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none">
        {showIcon && (
          <Calendar className="w-4 h-4 text-gray-400 ml-2" />
        )}
        <ChevronDown className="w-4 h-4 text-gray-400 ml-auto mr-2" />
      </div>
    </div>
  );
};

// Breadcrumb component for clear navigation context
interface BreadcrumbProps {
  items: Array<{
    label: string;
    href?: string;
    onClick?: () => void;
    isActive?: boolean;
  }>;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  return (
    <nav className={`flex items-center space-x-1 text-sm ${className}`} aria-label="Breadcrumb">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span className="text-gray-400 mx-2">/</span>
          )}
          {item.href || item.onClick ? (
            <button
              onClick={item.onClick}
              className={`
                hover:text-blue-600 transition-colors
                ${item.isActive 
                  ? 'text-blue-600 font-medium' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              {item.label}
            </button>
          ) : (
            <span 
              className={item.isActive ? 'text-gray-900 font-medium' : 'text-gray-600'}
            >
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

// Section indicator component for clear information hierarchy
interface SectionIndicatorProps {
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
  };
  actions?: React.ReactNode;
  className?: string;
}

export const SectionIndicator: React.FC<SectionIndicatorProps> = ({
  title,
  subtitle,
  badge,
  actions,
  className = ''
}) => {
  const badgeColors = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-700'
  };

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center space-x-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            {badge && (
              <span className={`
                px-2 py-1 rounded-full text-xs font-medium
                ${badgeColors[badge.color || 'gray']}
              `}>
                {badge.text}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center space-x-2">
          {actions}
        </div>
      )}
    </div>
  );
};