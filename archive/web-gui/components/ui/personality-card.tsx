'use client';

import React from 'react';
import { Eye } from 'lucide-react';
import { Personality } from '@/lib/stores/personality-store';

interface PersonalityCardProps {
  personality: Personality;
  isSelected: boolean;
  onSelect: () => void;
  onViewDetails: () => void;
}

export const PersonalityCard: React.FC<PersonalityCardProps> = ({
  personality,
  isSelected,
  onSelect,
  onViewDetails,
}) => {
  // Truncate description to preview length
  const truncateDescription = (text: string, maxLength: number = 80) => {
    if (!text) return 'No description available';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Get display name with special emoji for mentally-unstable
  const getDisplayName = () => {
    if (personality.id === 'mentally-unstable') {
      return (
        <>
          <span className="mr-2">🎲</span>
          {personality.name}
        </>
      );
    }
    return personality.name;
  };

  return (
    <div
      className={`
        relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer
        ${isSelected
          ? 'border-primary bg-primary/10 shadow-md scale-[1.02]'
          : 'border-border hover:border-primary/50 hover:bg-muted/50 hover:shadow-sm'
        }
      `}
      onClick={onSelect}
    >
      {/* Radio button */}
      <div className="absolute top-4 right-4">
        <input
          type="radio"
          name="personality"
          checked={isSelected}
          onChange={onSelect}
          className="w-4 h-4 text-primary focus:ring-primary"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Card content */}
      <div className="pr-8">
        <h3 className="text-lg font-semibold mb-2 capitalize">
          {getDisplayName()}
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          {truncateDescription(personality.description || '')}
        </p>

        {/* View Details button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          className="
            inline-flex items-center gap-2 px-3 py-1.5 
            text-sm font-medium rounded-md
            bg-primary/10 text-primary hover:bg-primary/20
            transition-colors duration-200
          "
        >
          <Eye className="w-4 h-4" />
          View Details
        </button>
      </div>

      {/* Default badge */}
      {personality.isDefault && (
        <div className="absolute bottom-2 right-2">
          <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full font-medium">
            Default
          </span>
        </div>
      )}
    </div>
  );
};