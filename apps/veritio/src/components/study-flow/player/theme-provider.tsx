'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  ReactNode,
} from 'react'
import type { ThemeMode } from '@/components/builders/shared/types'

interface ThemeContextValue {
  resolvedTheme: 'light' | 'dark'
  themeMode: ThemeMode
}

const ThemeContext = createContext<ThemeContextValue>({
  resolvedTheme: 'light',
  themeMode: 'light',
})

export function useTheme() {
  return useContext(ThemeContext)
}

interface ThemeProviderProps {
  themeMode?: ThemeMode
  children: ReactNode
}

export function ThemeProvider({
  themeMode = 'light',
  children,
}: ThemeProviderProps) {
  // Track system preference for 'system' mode
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>(
    'light'
  )

  // Detect initial system preference and listen for changes
  useEffect(() => {
    // Only need to track system preference if mode is 'system'
    if (themeMode !== 'system') return

    // Check if we're in browser environment
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    // Set initial value
    setSystemPreference(mediaQuery.matches ? 'dark' : 'light') // eslint-disable-line react-hooks/set-state-in-effect

    // Listen for changes
    const handler = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [themeMode])

  // Resolve the actual theme to display
  const resolvedTheme = useMemo(() => {
    if (themeMode === 'system') {
      return systemPreference
    }
    return themeMode === 'dark' ? 'dark' : 'light'
  }, [themeMode, systemPreference])

  const value = useMemo(
    () => ({
      resolvedTheme,
      themeMode: themeMode || 'light',
    }),
    [resolvedTheme, themeMode]
  )

  return (
    <ThemeContext.Provider value={value}>
      {/* Apply dark class to this container, scoped to participant UI */}
      <div className={resolvedTheme === 'dark' ? 'dark' : ''}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}
