import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
  color = 'currentColor'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div
      className={`${sizeClasses[size]} border-2 border-t-transparent rounded-full animate-spin ${className}`}
      style={{ borderColor: `${color} transparent transparent transparent` }}
    />
  );
};

export default LoadingSpinner;