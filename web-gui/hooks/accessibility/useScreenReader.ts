/**
 * Screen Reader Hook
 * Enhanced screen reader support and announcements
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAccessibility } from '../../contexts/accessibility-context';
import { type LiveRegionType } from '../../lib/accessibility/utils';

export interface ScreenReaderOptions {
  announcePageChanges?: boolean;
  announceFormErrors?: boolean;
  announceStateChanges?: boolean;
  liveRegionId?: string;
}

export function useScreenReader(options: ScreenReaderOptions = {}) {
  const { announce, preferences } = useAccessibility();
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const announcementQueueRef = useRef<Array<{ message: string; priority: LiveRegionType }>>([]);
  const isProcessingRef = useRef(false);

  const {
    announcePageChanges = true,
    announceFormErrors = true,
    announceStateChanges = true,
    liveRegionId = 'accessibility-live-region',
  } = options;

  // Create live region on mount
  useEffect(() => {
    if (!preferences.announceChanges) return;

    let liveRegion = document.getElementById(liveRegionId);

    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = liveRegionId;
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only absolute -top-px -left-px w-px h-px overflow-hidden';
      document.body.appendChild(liveRegion);
    }

    liveRegionRef.current = liveRegion as HTMLDivElement;

    return () => {
      // Don't remove on unmount as other components might be using it
    };
  }, [liveRegionId, preferences.announceChanges]);

  // Process announcement queue
  const processAnnouncements = useCallback(async () => {
    if (isProcessingRef.current || announcementQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;

    while (announcementQueueRef.current.length > 0) {
      const { message, priority } = announcementQueueRef.current.shift()!;

      if (liveRegionRef.current) {
        // Update aria-live attribute based on priority
        liveRegionRef.current.setAttribute('aria-live', priority);

        // Clear and set new message
        liveRegionRef.current.textContent = '';

        // Small delay to ensure screen reader picks up the change
        await new Promise((resolve) => setTimeout(resolve, 50));

        liveRegionRef.current.textContent = message;

        // Wait for announcement to complete
        await new Promise((resolve) => setTimeout(resolve, priority === 'assertive' ? 2000 : 1000));
      }
    }

    isProcessingRef.current = false;
  }, []);

  // Enhanced announce function with queuing
  const announceMessage = useCallback(
    (message: string, priority: LiveRegionType = 'polite', immediate = false) => {
      if (!preferences.announceChanges || !message.trim()) {
        return;
      }

      if (immediate) {
        // For urgent announcements, clear queue and announce immediately
        announcementQueueRef.current = [];
        announce(message, priority);
      } else {
        // Add to queue for sequential processing
        announcementQueueRef.current.push({ message, priority });
        processAnnouncements();
      }
    },
    [announce, preferences.announceChanges, processAnnouncements]
  );

  // Announce page changes
  const announcePageChange = useCallback(
    (pageName: string, route?: string) => {
      if (announcePageChanges) {
        const message = route
          ? `Navigated to ${pageName} page at ${route}`
          : `Navigated to ${pageName} page`;
        announceMessage(message, 'polite');
      }
    },
    [announcePageChanges, announceMessage]
  );

  // Announce form errors
  const announceFormError = useCallback(
    (fieldName: string, errorMessage: string) => {
      if (announceFormErrors) {
        announceMessage(`Error in ${fieldName}: ${errorMessage}`, 'assertive', true);
      }
    },
    [announceFormErrors, announceMessage]
  );

  // Announce state changes
  const announceStateChange = useCallback(
    (change: string, details?: string) => {
      if (announceStateChanges) {
        const message = details ? `${change}: ${details}` : change;
        announceMessage(message, 'polite');
      }
    },
    [announceStateChanges, announceMessage]
  );

  // Announce loading states
  const announceLoading = useCallback(
    (isLoading: boolean, context = 'Content') => {
      if (announceStateChanges) {
        const message = isLoading ? `${context} is loading` : `${context} loaded`;
        announceMessage(message, 'polite');
      }
    },
    [announceStateChanges, announceMessage]
  );

  // Announce success/error actions
  const announceAction = useCallback(
    (action: string, success: boolean, details?: string) => {
      const status = success ? 'successful' : 'failed';
      const message = details ? `${action} ${status}: ${details}` : `${action} ${status}`;

      announceMessage(message, success ? 'polite' : 'assertive', !success);
    },
    [announceMessage]
  );

  // Focus management for screen readers
  const manageFocus = useCallback(
    (element: HTMLElement | null, announcement?: string) => {
      if (!element) return;

      // Ensure element is focusable
      if (
        !element.hasAttribute('tabindex') &&
        !element.matches('button, input, select, textarea, a[href]')
      ) {
        element.setAttribute('tabindex', '-1');
      }

      // Focus the element
      element.focus();

      // Announce if provided
      if (announcement) {
        announceMessage(announcement, 'polite');
      }
    },
    [announceMessage]
  );

  return {
    announce: announceMessage,
    announcePageChange,
    announceFormError,
    announceStateChange,
    announceLoading,
    announceAction,
    manageFocus,
    isScreenReaderOptimized: preferences.screenReaderOptimized,
    liveRegionRef,
  };
}
