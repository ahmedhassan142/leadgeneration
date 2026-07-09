// components/common/LoadingSpinner.tsx
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  fullScreen?: boolean;
  text?: string;
  variant?: 'spinner' | 'dots' | 'pulse' | 'bar';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  fullScreen = false,
  text,
  variant = 'spinner'
}) => {
  
  // Size mappings
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  // Color mappings
  const colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-purple-600',
    white: 'text-white',
    gray: 'text-gray-400'
  };

  // Spinner Variant
  const SpinnerVariant = () => (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );

  // Dots Variant
  const DotsVariant = () => (
    <div className="flex space-x-2">
      <div className={`${sizeClasses[size]} ${colorClasses[color]} animate-bounce`} style={{ animationDelay: '0ms' }}>
        <div className="w-full h-full rounded-full bg-current opacity-60"></div>
      </div>
      <div className={`${sizeClasses[size]} ${colorClasses[color]} animate-bounce`} style={{ animationDelay: '150ms' }}>
        <div className="w-full h-full rounded-full bg-current opacity-60"></div>
      </div>
      <div className={`${sizeClasses[size]} ${colorClasses[color]} animate-bounce`} style={{ animationDelay: '300ms' }}>
        <div className="w-full h-full rounded-full bg-current opacity-60"></div>
      </div>
    </div>
  );

  // Pulse Variant
  const PulseVariant = () => (
    <div className="relative">
      <div className={`${sizeClasses[size]} ${colorClasses[color]}`}>
        <div className="w-full h-full rounded-full bg-current opacity-75 animate-ping"></div>
      </div>
      <div className={`absolute top-0 left-0 ${sizeClasses[size]} ${colorClasses[color]}`}>
        <div className="w-full h-full rounded-full bg-current opacity-75"></div>
      </div>
    </div>
  );

  // Bar Variant
  const BarVariant = () => (
    <div className="w-full max-w-md">
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClasses[color].replace('text', 'bg')} animate-[progress_1s_ease-in-out_infinite]`}
          style={{ width: '30%' }}
        ></div>
      </div>
      {text && <p className="text-sm text-gray-500 mt-2 text-center">{text}</p>}
    </div>
  );

  // Render appropriate variant
  const renderVariant = () => {
    switch (variant) {
      case 'dots':
        return <DotsVariant />;
      case 'pulse':
        return <PulseVariant />;
      case 'bar':
        return <BarVariant />;
      default:
        return <SpinnerVariant />;
    }
  };

  // Full screen wrapper
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center space-y-4">
          {renderVariant()}
          {text && <p className="text-gray-600 text-lg font-medium animate-pulse">{text}</p>}
        </div>
      </div>
    );
  }

  // Inline spinner
  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      {renderVariant()}
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  );
};

// Page Loader Component (Full page loading)
export const PageLoader: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="lg" text={text} />
  </div>
);

// Section Loader Component (For loading sections)
export const SectionLoader: React.FC<{ height?: string }> = ({ height = '200px' }) => (
  <div className="flex items-center justify-center" style={{ minHeight: height }}>
    <LoadingSpinner size="md" />
  </div>
);

// Button Loader Component (For buttons)
export const ButtonLoader: React.FC<{ color?: 'primary' | 'white' }> = ({ color = 'white' }) => (
  <LoadingSpinner size="sm" color={color} />
);

// Table Row Loader Component
export const TableRowLoader: React.FC<{ columns?: number }> = ({ columns = 5 }) => (
  <tr>
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
      </td>
    ))}
  </tr>
);

// Card Loader Component
export const CardLoader: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6 space-y-4">
    <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
      <div className="h-4 bg-gray-200 rounded w-4/6 animate-pulse"></div>
    </div>
    <div className="pt-4">
      <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
    </div>
  </div>
);

// List Loader Component
export const ListLoader: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4">
        <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>
      </div>
    ))}
  </div>
);

// Chart Loader Component
export const ChartLoader: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="h-6 bg-gray-200 rounded w-1/4 mb-6 animate-pulse"></div>
    <div className="flex items-end space-x-2 h-40">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-gray-200 rounded-t animate-pulse"
          style={{ height: `${Math.random() * 100 + 20}%` }}
        ></div>
      ))}
    </div>
  </div>
);

export default LoadingSpinner;