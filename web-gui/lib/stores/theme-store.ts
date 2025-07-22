import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { migrateThemeSettings } from '@/lib/utils/migrate-theme-settings'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  currentTheme: Theme
  setTheme: (theme: Theme) => void
}

// Helper function to apply theme classes
const applyThemeClasses = (theme: Theme) => {
  if (typeof document === 'undefined') return

  // Remove existing theme class
  document.documentElement.classList.remove('dark')
  
  if (theme === 'dark') {
    // Apply dark class for Tailwind CSS dark mode
    document.documentElement.classList.add('dark')
  } else if (theme === 'system') {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      document.documentElement.classList.add('dark')
    }
  }
  // For 'light' theme, we just remove the 'dark' class (done above)
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      currentTheme: 'system',
      
      setTheme: (theme: Theme) => {
        set({ currentTheme: theme })
        applyThemeClasses(theme)
      }
    }),
    {
      name: 'dinoair-free-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Apply theme on hydration
          applyThemeClasses(state.currentTheme)
        }
      }
    }
  )
)

// Initialize theme on first load
if (typeof window !== 'undefined') {
  // Run migration first
  migrateThemeSettings()
  
  const savedTheme = localStorage.getItem('dinoair-free-theme')
  if (savedTheme) {
    try {
      const parsed = JSON.parse(savedTheme)
      if (parsed.state?.currentTheme) {
        applyThemeClasses(parsed.state.currentTheme)
      }
    } catch (error) {
      console.warn('Failed to parse saved theme:', error)
    }
  } else {
    // If no saved theme, apply system theme by default
    applyThemeClasses('system')
  }
  
  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    const state = useThemeStore.getState()
    if (state.currentTheme === 'system') {
      applyThemeClasses('system')
    }
  })
}