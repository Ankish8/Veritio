'use client'

import { createContext, useContext, useEffect } from 'react'
import type { DashboardTheme } from '@/lib/supabase/user-preferences-types'

type ResolvedTheme = 'light' | 'dark'

interface DashboardThemeContextValue {
  theme: DashboardTheme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: DashboardTheme) => void
}

// Dark mode is disabled for now — always light
const FIXED_VALUE: DashboardThemeContextValue = {
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: () => {},
}

const DashboardThemeContext = createContext<DashboardThemeContextValue>(FIXED_VALUE)

export function DashboardThemeProvider({ children }: { children: React.ReactNode }) {
  // Ensure dark class is removed and localStorage is cleaned up
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    localStorage.removeItem('dashboard-theme')
  }, [])

  return (
    <DashboardThemeContext.Provider value={FIXED_VALUE}>
      {children}
    </DashboardThemeContext.Provider>
  )
}

export function useDashboardTheme() {
  return useContext(DashboardThemeContext)
}
