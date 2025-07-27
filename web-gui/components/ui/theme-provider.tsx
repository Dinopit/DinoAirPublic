'use client';

import React from 'react';

import { useThemeStore } from '@/lib/stores/theme-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // This hook call ensures the store is initialized on the client side.
  // The store's internal logic will handle applying the theme from localStorage.
  useThemeStore();

  return <>{children}</>;
}
