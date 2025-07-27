'use client';

import { useCallback } from 'react';

interface ScreenReaderAnnouncement {
  message: string;
  priority?: 'polite' | 'assertive';
  delay?: number;
}

export const useScreenReader = () => {
  const announce = useCallback(({ message, priority = 'polite', delay = 0 }: ScreenReaderAnnouncement) => {
    const announceMessage = () => {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', priority);
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = message;
      
      document.body.appendChild(announcement);
      
      setTimeout(() => {
        if (document.body.contains(announcement)) {
          document.body.removeChild(announcement);
        }
      }, 1000);
    };

    if (delay > 0) {
      setTimeout(announceMessage, delay);
    } else {
      announceMessage();
    }
  }, []);

  const announceNavigation = useCallback((destination: string) => {
    announce({
      message: `Navigated to ${destination}`,
      priority: 'polite',
      delay: 100
    });
  }, [announce]);

  const announceAction = useCallback((action: string) => {
    announce({
      message: action,
      priority: 'assertive'
    });
  }, [announce]);

  const announceError = useCallback((error: string) => {
    announce({
      message: `Error: ${error}`,
      priority: 'assertive'
    });
  }, [announce]);

  const announceSuccess = useCallback((success: string) => {
    announce({
      message: `Success: ${success}`,
      priority: 'polite'
    });
  }, [announce]);

  return {
    announce,
    announceNavigation,
    announceAction,
    announceError,
    announceSuccess
  };
};
