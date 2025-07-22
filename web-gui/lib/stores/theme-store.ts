import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

interface ThemeState {
  currentTheme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      currentTheme: 'light',
      
      setTheme: (theme: Theme) => {
        set({ currentTheme: theme })
        // Apply theme to document
        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('light', 'dark')
          document.documentElement.classList.add(theme)
        }
      }
    }),
    {
      name: 'dinoair-free-theme',
      onRehydrateStorage: () => (state) => {
        if (state && typeof document !== 'undefined') {
          // Apply theme on hydration
          document.documentElement.classList.remove('light', 'dark')
          document.documentElement.classList.add(state.currentTheme)
        }
      }
    }
  )
)

// Initialize theme on first load
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('dinoair-free-theme')
  if (savedTheme) {
    try {
      const parsed = JSON.parse(savedTheme)
      if (parsed.state?.currentTheme) {
        document.documentElement.classList.remove('light', 'dark')
        document.documentElement.classList.add(parsed.state.currentTheme)
      }
    } catch (error) {
      console.warn('Failed to parse saved theme:', error)
    }
  }
}