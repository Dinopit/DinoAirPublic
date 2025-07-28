/**
 * Accessibility Context
 * React context for managing accessibility preferences
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  AccessibilityPreferences,
  defaultAccessibilityPreferences,
  getAccessibilityPreferences,
  setAccessibilityPreferences,
  applyAccessibilityClasses,
  prefersReducedMotion,
  prefersHighContrast,
  announceToScreenReader,
  type LiveRegionType,
} from '../lib/accessibility/utils';

interface IAccessibilityContext {
  preferences: AccessibilityPreferences;
  updatePreferences: (updates: Partial<AccessibilityPreferences>) => void;
  announce: (message: string, priority?: LiveRegionType) => void;
  resetPreferences: () => void;
  isLoading: boolean;
}

const AccessibilityContext = createContext<IAccessibilityContext | null>(null);

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(
    defaultAccessibilityPreferences
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = () => {
      const stored = getAccessibilityPreferences();

      // Detect system preferences and merge with stored preferences
      const systemPreferences: Partial<AccessibilityPreferences> = {
        reduceMotion: prefersReducedMotion(),
        highContrast: prefersHighContrast(),
      };

      // Only apply system preferences if not explicitly set by user
      const merged = {
        ...stored,
        ...(!stored.reduceMotion && systemPreferences.reduceMotion ? { reduceMotion: true } : {}),
        ...(!stored.highContrast && systemPreferences.highContrast ? { highContrast: true } : {}),
      };

      setPreferences(merged);
      applyAccessibilityClasses(merged);
      setIsLoading(false);
    };

    loadPreferences();
  }, []);

  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

    const handleReduceMotionChange = (e: MediaQueryListEvent) => {
      updatePreferences({ reduceMotion: e.matches });
    };

    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      updatePreferences({ highContrast: e.matches });
    };

    reduceMotionQuery.addEventListener('change', handleReduceMotionChange);
    highContrastQuery.addEventListener('change', handleHighContrastChange);

    return () => {
      reduceMotionQuery.removeEventListener('change', handleReduceMotionChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
    };
  }, []);

  const updatePreferences = useCallback((updates: Partial<AccessibilityPreferences>) => {
    setPreferences((current) => {
      const updated = { ...current, ...updates };
      setAccessibilityPreferences(updates);
      applyAccessibilityClasses(updated);
      return updated;
    });
  }, []);

  const announce = useCallback(
    (message: string, priority: LiveRegionType = 'polite') => {
      if (preferences.announceChanges) {
        announceToScreenReader(message, priority);
      }
    },
    [preferences.announceChanges]
  );

  const resetPreferences = useCallback(() => {
    const systemPreferences: Partial<AccessibilityPreferences> = {
      reduceMotion: prefersReducedMotion(),
      highContrast: prefersHighContrast(),
    };

    const reset = { ...defaultAccessibilityPreferences, ...systemPreferences };
    setPreferences(reset);
    setAccessibilityPreferences(reset);
    applyAccessibilityClasses(reset);
    announce('Accessibility settings reset to defaults');
  }, [announce]);

  const value: IAccessibilityContext = {
    preferences,
    updatePreferences,
    announce,
    resetPreferences,
    isLoading,
  };

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility(): IAccessibilityContext {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

export { AccessibilityContext };
