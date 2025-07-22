import React, { useState, useEffect } from 'react';

interface CardProps {
  title: string;
  description?: string;
  imageUrl?: string;
  onAction?: () => void;
  actionLabel?: string;
  variant?: 'default' | 'primary' | 'secondary';
}

/**
 * Reusable Card Component
 * A flexible card component that can display content with optional image and action button
 */
export const Card: React.FC<CardProps> = ({
  title,
  description,
  imageUrl,
  onAction,
  actionLabel = 'Learn More',
  variant = 'default'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleAction = async () => {
    if (!onAction) return;
    
    setIsLoading(true);
    try {
      await onAction();
    } finally {
      setIsLoading(false);
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'border-blue-500 bg-blue-50';
      case 'secondary':
        return 'border-gray-500 bg-gray-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  return (
    <div className={`rounded-lg border p-6 shadow-sm transition-shadow hover:shadow-md ${getVariantClasses()}`}>
      {imageUrl && !imageError && (
        <div className="mb-4 h-48 w-full overflow-hidden rounded-md">
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        </div>
      )}
      
      <h3 className="mb-2 text-xl font-semibold text-gray-900">{title}</h3>
      
      {description && (
        <p className="mb-4 text-gray-600">{description}</p>
      )}
      
      {onAction && (
        <button
          onClick={handleAction}
          disabled={isLoading}
          className={`
            rounded-md px-4 py-2 text-sm font-medium transition-colors
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            ${variant === 'primary' 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-600 text-white hover:bg-gray-700'
            }
          `}
        >
          {isLoading ? 'Loading...' : actionLabel}
        </button>
      )}
    </div>
  );
};

// Example usage:
export const CardExample = () => {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card
        title="Basic Card"
        description="This is a simple card with text content"
      />
      
      <Card
        title="Interactive Card"
        description="Click the button to trigger an action"
        variant="primary"
        onAction={() => alert('Action triggered!')}
        actionLabel="Click Me"
      />
      
      <Card
        title="Image Card"
        description="Card with an image header"
        imageUrl="https://via.placeholder.com/300x200"
        variant="secondary"
        onAction={() => console.log('Learn more clicked')}
      />
    </div>
  );
};