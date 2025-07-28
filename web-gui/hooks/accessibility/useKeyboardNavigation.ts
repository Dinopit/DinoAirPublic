/**
 * Enhanced Keyboard Navigation Hook
 * Comprehensive keyboard navigation support
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAccessibility } from '../../contexts/accessibility-context';

export interface KeyboardNavigationOptions {
  enableArrowNavigation?: boolean;
  enableTabTrapping?: boolean;
  enableEscapeHandling?: boolean;
  enableEnterActivation?: boolean;
  customKeyHandlers?: Record<string, (event: KeyboardEvent) => void>;
  focusableSelectors?: string[];
}

export interface FocusableElement extends HTMLElement {
  _originalTabIndex?: string;
}

const DEFAULT_FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
  '[role="button"]:not([aria-disabled="true"])',
  '[role="link"]:not([aria-disabled="true"])',
  '[role="menuitem"]:not([aria-disabled="true"])',
  '[role="tab"]:not([aria-disabled="true"])',
  '[role="option"]:not([aria-disabled="true"])',
];

export function useKeyboardNavigation(
  containerRef: React.RefObject<HTMLElement>,
  options: KeyboardNavigationOptions = {}
) {
  const { preferences, announce } = useAccessibility();
  const currentFocusIndexRef = useRef<number>(-1);
  const focusableElementsRef = useRef<FocusableElement[]>([]);
  const trapFocusRef = useRef<boolean>(false);

  const {
    enableArrowNavigation = true,
    enableTabTrapping = false,
    enableEscapeHandling = true,
    enableEnterActivation = true,
    customKeyHandlers = {},
    focusableSelectors = DEFAULT_FOCUSABLE_SELECTORS,
  } = options;

  // Get all focusable elements
  const getFocusableElements = useCallback((): FocusableElement[] => {
    if (!containerRef.current) return [];

    const selector = focusableSelectors.join(', ');
    const elements = Array.from(
      containerRef.current.querySelectorAll(selector)
    ) as FocusableElement[];

    return elements.filter((el) => {
      const style = window.getComputedStyle(el);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        !el.hasAttribute('aria-hidden') &&
        el.offsetParent !== null
      );
    });
  }, [containerRef, focusableSelectors]);

  // Update focusable elements list
  const updateFocusableElements = useCallback(() => {
    focusableElementsRef.current = getFocusableElements();

    // Update current focus index
    const activeElement = document.activeElement as FocusableElement;
    if (activeElement && focusableElementsRef.current.includes(activeElement)) {
      currentFocusIndexRef.current = focusableElementsRef.current.indexOf(activeElement);
    } else {
      currentFocusIndexRef.current = -1;
    }
  }, [getFocusableElements]);

  // Focus element by index
  const focusElementByIndex = useCallback(
    (index: number, announce = true) => {
      const elements = focusableElementsRef.current;
      if (index < 0 || index >= elements.length) return false;

      const element = elements[index];
      element.focus();
      currentFocusIndexRef.current = index;

      if (announce && preferences.announceChanges) {
        const announcement = getElementAnnouncement(element);
        if (announcement) {
          setTimeout(() => {
            announceMessage(announcement, 'polite');
          }, 100);
        }
      }

      return true;
    },
    [preferences.announceChanges]
  );

  // Get announcement text for element
  const getElementAnnouncement = useCallback((element: HTMLElement): string => {
    const role = element.getAttribute('role') || element.tagName.toLowerCase();
    const label =
      element.getAttribute('aria-label') ||
      element.getAttribute('title') ||
      element.textContent?.trim() ||
      'Interactive element';

    const state = [];

    if (element.hasAttribute('aria-expanded')) {
      const expanded = element.getAttribute('aria-expanded') === 'true';
      state.push(expanded ? 'expanded' : 'collapsed');
    }

    if (element.hasAttribute('aria-checked')) {
      const checked = element.getAttribute('aria-checked') === 'true';
      state.push(checked ? 'checked' : 'unchecked');
    }

    if (element.hasAttribute('aria-selected')) {
      const selected = element.getAttribute('aria-selected') === 'true';
      state.push(selected ? 'selected' : 'not selected');
    }

    const stateText = state.length > 0 ? `, ${state.join(', ')}` : '';
    return `${label}, ${role}${stateText}`;
  }, []);

  // Navigate to next/previous element
  const navigateToElement = useCallback(
    (direction: 'next' | 'previous', wrap = true) => {
      updateFocusableElements();
      const elements = focusableElementsRef.current;

      if (elements.length === 0) return false;

      let newIndex: number;

      if (direction === 'next') {
        newIndex = currentFocusIndexRef.current + 1;
        if (newIndex >= elements.length) {
          newIndex = wrap ? 0 : elements.length - 1;
        }
      } else {
        newIndex = currentFocusIndexRef.current - 1;
        if (newIndex < 0) {
          newIndex = wrap ? elements.length - 1 : 0;
        }
      }

      return focusElementByIndex(newIndex);
    },
    [updateFocusableElements, focusElementByIndex]
  );

  // Focus first element
  const focusFirst = useCallback(() => {
    updateFocusableElements();
    return focusElementByIndex(0);
  }, [updateFocusableElements, focusElementByIndex]);

  // Focus last element
  const focusLast = useCallback(() => {
    updateFocusableElements();
    const elements = focusableElementsRef.current;
    return focusElementByIndex(elements.length - 1);
  }, [updateFocusableElements, focusElementByIndex]);

  // Enable focus trapping
  const enableFocusTrapping = useCallback(() => {
    trapFocusRef.current = true;
    updateFocusableElements();

    // Store original tabindex values
    focusableElementsRef.current.forEach((element) => {
      if (!element._originalTabIndex) {
        element._originalTabIndex = element.getAttribute('tabindex') || '';
      }
    });

    // Make container focusable if it's not already
    if (containerRef.current && !containerRef.current.hasAttribute('tabindex')) {
      containerRef.current.setAttribute('tabindex', '-1');
    }
  }, [containerRef, updateFocusableElements]);

  // Disable focus trapping
  const disableFocusTrapping = useCallback(() => {
    trapFocusRef.current = false;

    // Restore original tabindex values
    focusableElementsRef.current.forEach((element) => {
      if (element._originalTabIndex !== undefined) {
        if (element._originalTabIndex === '') {
          element.removeAttribute('tabindex');
        } else {
          element.setAttribute('tabindex', element._originalTabIndex);
        }
        delete element._originalTabIndex;
      }
    });
  }, []);

  // Keyboard event handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!preferences.keyboardNavigation) return;

      const { key, ctrlKey, altKey, shiftKey } = event;

      // Handle custom key handlers first
      const customHandler =
        customKeyHandlers[key] ||
        customKeyHandlers[
          `${key}${ctrlKey ? '+Ctrl' : ''}${altKey ? '+Alt' : ''}${shiftKey ? '+Shift' : ''}`
        ];
      if (customHandler) {
        customHandler(event);
        return;
      }

      switch (key) {
        case 'ArrowDown':
        case 'ArrowRight':
          if (enableArrowNavigation) {
            event.preventDefault();
            navigateToElement('next');
          }
          break;

        case 'ArrowUp':
        case 'ArrowLeft':
          if (enableArrowNavigation) {
            event.preventDefault();
            navigateToElement('previous');
          }
          break;

        case 'Home':
          if (enableArrowNavigation) {
            event.preventDefault();
            focusFirst();
          }
          break;

        case 'End':
          if (enableArrowNavigation) {
            event.preventDefault();
            focusLast();
          }
          break;

        case 'Tab':
          if (enableTabTrapping && trapFocusRef.current) {
            event.preventDefault();
            navigateToElement(shiftKey ? 'previous' : 'next');
          }
          break;

        case 'Escape':
          if (enableEscapeHandling) {
            // Let parent components handle escape
            const escapeEvent = new CustomEvent('keyboardNavigationEscape', {
              detail: { originalEvent: event },
            });
            containerRef.current?.dispatchEvent(escapeEvent);
          }
          break;

        case 'Enter':
        case ' ':
          if (enableEnterActivation) {
            const activeElement = document.activeElement as HTMLElement;
            if (activeElement && focusableElementsRef.current.includes(activeElement)) {
              // Don't prevent default for actual buttons and links
              if (
                !activeElement.matches(
                  'button, input[type="button"], input[type="submit"], a[href]'
                )
              ) {
                event.preventDefault();
                activeElement.click();
              }
            }
          }
          break;
      }
    },
    [
      preferences.keyboardNavigation,
      customKeyHandlers,
      enableArrowNavigation,
      enableTabTrapping,
      enableEscapeHandling,
      enableEnterActivation,
      navigateToElement,
      focusFirst,
      focusLast,
      containerRef,
    ]
  );

  // Set up keyboard event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !preferences.keyboardNavigation) return;

    container.addEventListener('keydown', handleKeyDown);

    // Update focusable elements when DOM changes
    const observer = new MutationObserver(updateFocusableElements);
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled', 'tabindex', 'aria-hidden'],
    });

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      observer.disconnect();
    };
  }, [containerRef, preferences.keyboardNavigation, handleKeyDown, updateFocusableElements]);

  // Initialize focusable elements on mount
  useEffect(() => {
    updateFocusableElements();
  }, [updateFocusableElements]);

  return {
    focusFirst,
    focusLast,
    navigateToElement,
    focusElementByIndex,
    updateFocusableElements,
    enableFocusTrapping,
    disableFocusTrapping,
    getFocusableElements,
    currentFocusIndex: currentFocusIndexRef.current,
    focusableElementsCount: focusableElementsRef.current.length,
    isKeyboardNavigationEnabled: preferences.keyboardNavigation,
  };
}
