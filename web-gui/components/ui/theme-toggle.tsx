'use client';

import { useThemeStore } from '@/lib/stores/theme-store';
import type { Theme } from '@/lib/stores/theme-store';

export function ThemeToggle() {
  const { currentTheme, setTheme } = useThemeStore();

  const toggleTheme = () => {
    // Cycle through themes: light -> dark -> system -> light
    const themeOrder: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themeOrder.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  };

  const getNextThemeName = () => {
    switch (currentTheme) {
      case 'light':
        return 'dark';
      case 'dark':
        return 'system';
      case 'system':
        return 'light';
      default:
        return 'dark';
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-muted transition-colors"
      title={`Switch to ${getNextThemeName()} mode`}
      aria-label={`Switch to ${getNextThemeName()} mode`}
    >
      {currentTheme === 'light' ? (
        // Sun icon for light mode
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className="text-foreground"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zM4 10a6 6 0 1112 0 6 6 0 01-12 0zm14 0a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM4 10a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zm12.071-5.071a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zm-8.485 8.485a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM15.314 15.314a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414zM6.343 6.343a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414z"
            fill="currentColor"
          />
          <circle cx="10" cy="10" r="3" fill="currentColor" />
        </svg>
      ) : currentTheme === 'dark' ? (
        // Moon icon for dark mode
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className="text-foreground"
        >
          <path
            d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
            fill="currentColor"
          />
        </svg>
      ) : (
        // System icon (computer/monitor)
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className="text-foreground"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-4v2h2a1 1 0 110 2H7a1 1 0 110-2h2v-2H5a2 2 0 01-2-2V5zm2 0h10v8H5V5z"
            fill="currentColor"
          />
          <path
            d="M10 10.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
            fill="currentColor"
          />
        </svg>
      )}
    </button>
  );
}