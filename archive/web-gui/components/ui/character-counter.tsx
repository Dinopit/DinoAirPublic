/**
 * Character counter component for text inputs
 * Easy win: Better user feedback for input limits
 */

import React from 'react';
import { ChatValidator } from '@/lib/validation/chat-validation';

interface CharacterCounterProps {
  content: string;
  className?: string;
  showCount?: boolean;
}

export const CharacterCounter: React.FC<CharacterCounterProps> = ({
  content,
  className = '',
  showCount = true,
}) => {
  const status = ChatValidator.getCharacterCountStatus(content);

  // Color classes based on status
  const getColorClass = () => {
    switch (status.level) {
      case 'safe':
        return 'text-muted-foreground';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'danger':
        return 'text-orange-600 dark:text-orange-400';
      case 'exceeded':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  // Progress bar percentage
  const percentage = Math.min((status.count / status.max) * 100, 100);

  // Progress bar color
  const getProgressColor = () => {
    switch (status.level) {
      case 'safe':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'danger':
        return 'bg-orange-500';
      case 'exceeded':
        return 'bg-red-500';
      default:
        return 'bg-green-500';
    }
  };

  if (status.level === 'safe' && !showCount) {
    return null; // Don't show when safe and showCount is false
  }

  return (
    <div className={`text-xs space-y-1 ${className}`} role="status" aria-live="polite">
      {/* Character count text */}
      <div className={`flex justify-between items-center ${getColorClass()}`}>
        <span>
          {status.level === 'exceeded' ? (
            <span className="font-medium">
              Message too long by {Math.abs(status.remaining)} characters
            </span>
          ) : status.level === 'danger' ? (
            <span className="font-medium">{status.remaining} characters remaining</span>
          ) : status.level === 'warning' ? (
            <span>{status.remaining} characters remaining</span>
          ) : (
            showCount && (
              <span>
                {status.count.toLocaleString()} / {status.max.toLocaleString()}
              </span>
            )
          )}
        </span>

        {/* Warning icons */}
        {status.level === 'exceeded' && (
          <span className="ml-2" aria-label="Error">
            ⚠️
          </span>
        )}
        {status.level === 'danger' && (
          <span className="ml-2" aria-label="Warning">
            ⚠️
          </span>
        )}
      </div>

      {/* Progress bar */}
      {(status.level !== 'safe' || showCount) && (
        <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${getProgressColor()}`}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={status.count}
            aria-valuemin={0}
            aria-valuemax={status.max}
            aria-label={`${status.count} of ${status.max} characters used`}
          />
        </div>
      )}

      {/* Helpful hints */}
      {status.level === 'exceeded' && (
        <div className="text-red-600 dark:text-red-400 text-xs">
          Please shorten your message to continue.
        </div>
      )}
      {status.level === 'danger' && (
        <div className="text-orange-600 dark:text-orange-400 text-xs">
          Approaching character limit.
        </div>
      )}
    </div>
  );
};

export default CharacterCounter;
