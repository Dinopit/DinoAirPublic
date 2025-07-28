import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: boolean;
  pulse?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = true,
  pulse = false,
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded';
      case 'circular':
        return 'rounded-full';
      case 'rounded':
        return 'rounded-lg';
      case 'rectangular':
      default:
        return 'rounded';
    }
  };

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1rem' : '100%'),
  };

  return (
    <div
      className={`
        bg-gray-200 dark:bg-gray-700
        ${animation ? (pulse ? 'animate-pulse' : 'skeleton') : ''}
        ${getVariantClasses()}
        ${className}
      `}
      style={style}
      role="status"
      aria-label="Loading content"
    />
  );
};

// Enhanced composite skeleton components
export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
  variance?: boolean;
}> = ({ lines = 3, className = '', variance = true }) => {
  const getLineWidth = (index: number, total: number) => {
    if (!variance) return '100%';
    if (index === total - 1) return '60%'; // Last line shorter
    if (index === 0) return '90%'; // First line slightly shorter
    return '100%';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={getLineWidth(i, lines)} className="h-4" />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC<{
  className?: string;
  showAvatar?: boolean;
  showActions?: boolean;
}> = ({ className = '', showAvatar = true, showActions = false }) => {
  return (
    <div className={`p-4 border rounded-lg space-y-3 ${className}`}>
      {showAvatar && (
        <div className="flex items-center space-x-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="50%" />
            <Skeleton variant="text" width="30%" />
          </div>
        </div>
      )}
      <SkeletonText lines={3} />
      {showActions && (
        <div className="flex gap-2 pt-2">
          <Skeleton width={80} height={32} className="rounded" />
          <Skeleton width={60} height={32} className="rounded" />
        </div>
      )}
    </div>
  );
};

export const SkeletonMessage: React.FC<{
  isUser?: boolean;
  className?: string;
  showTimestamp?: boolean;
}> = ({ isUser = false, className = '', showTimestamp = true }) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${className}`}>
      <div
        className={`
          max-w-[70%] p-3 rounded-lg space-y-2
          ${isUser ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-gray-800'}
        `}
      >
        <SkeletonText lines={2} variance={true} />
        {showTimestamp && <Skeleton variant="text" width="40%" className="h-3" />}
      </div>
    </div>
  );
};

export const SkeletonList: React.FC<{
  items?: number;
  className?: string;
  showDividers?: boolean;
}> = ({ items = 5, className = '', showDividers = true }) => {
  return (
    <div className={`space-y-0 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i}>
          <div className="flex items-center space-x-3 p-3">
            <Skeleton variant="circular" width={32} height={32} />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="70%" />
              <Skeleton variant="text" width="40%" />
            </div>
            <Skeleton width={60} height={20} className="rounded" />
          </div>
          {showDividers && i < items - 1 && (
            <div className="border-b border-gray-200 dark:border-gray-700" />
          )}
        </div>
      ))}
    </div>
  );
};

export const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
  showHeader?: boolean;
}> = ({ rows = 5, columns = 4, className = '', showHeader = true }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {showHeader && (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} variant="text" width="80%" className="h-5" />
          ))}
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                variant="text"
                width={colIndex === 0 ? '90%' : '70%'}
                className="h-4"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonChat: React.FC<{
  messages?: number;
  className?: string;
}> = ({ messages = 4, className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: messages }).map((_, i) => (
        <SkeletonMessage key={i} isUser={i % 2 === 0} showTimestamp={true} />
      ))}
      {/* Typing indicator */}
      <div className="flex justify-start">
        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '0.1s' }}
            />
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '0.2s' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const SkeletonDashboard: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton width="200px" height="28px" className="rounded" />
          <Skeleton width="300px" height="16px" className="rounded" />
        </div>
        <Skeleton width="120px" height="40px" className="rounded" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton width="20px" height="16px" className="rounded" />
            </div>
            <div className="space-y-2">
              <Skeleton width="60%" height="20px" className="rounded" />
              <Skeleton width="80%" height="32px" className="rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="p-4 border rounded-lg">
        <Skeleton width="150px" height="20px" className="rounded mb-4" />
        <Skeleton width="100%" height="200px" className="rounded" />
      </div>

      {/* Table */}
      <div className="border rounded-lg p-4">
        <Skeleton width="100px" height="20px" className="rounded mb-4" />
        <SkeletonTable rows={6} columns={4} showHeader={true} />
      </div>
    </div>
  );
};

// Loading wrapper component
export const LoadingWrapper: React.FC<{
  loading: boolean;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  className?: string;
}> = ({ loading, children, skeleton, className = '' }) => {
  if (loading) {
    return (
      <div className={className} role="status" aria-label="Loading">
        {skeleton || <SkeletonCard />}
      </div>
    );
  }

  return <>{children}</>;
};
