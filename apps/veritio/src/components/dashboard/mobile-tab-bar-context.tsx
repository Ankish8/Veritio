'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { LucideIcon } from 'lucide-react'

export interface MobileTabBarItem {
  id: string
  label: string
  icon: LucideIcon
}

export interface MobileTabBarConfig {
  items: MobileTabBarItem[]
  activeId: string
  onSelect: (id: string) => void
}

interface MobileTabBarContextValue {
  config: MobileTabBarConfig | null
  setConfig: (config: MobileTabBarConfig | null) => void
}

const MobileTabBarContext = createContext<MobileTabBarContextValue | null>(null)

/**
 * Lets a page take over the mobile bottom bar with its own tabs.
 *
 * On a phone the results tabs are the navigation that actually matters, and
 * they were competing for vertical space with a global bar the user rarely
 * needs mid-analysis. While a page registers here the bottom bar shows that
 * page's tabs instead; global destinations stay reachable from the sidebar
 * trigger in the header.
 */
export function MobileTabBarProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<MobileTabBarConfig | null>(null)

  const value = useMemo(() => ({ config, setConfig }), [config])

  return (
    <MobileTabBarContext.Provider value={value}>
      {children}
    </MobileTabBarContext.Provider>
  )
}

export function useMobileTabBar() {
  return useContext(MobileTabBarContext)
}

/**
 * Registers a tab bar for as long as the calling component is mounted.
 * Callers should memoise `items` so this does not re-register every render.
 */
export function useRegisterMobileTabBar(
  items: MobileTabBarItem[],
  activeId: string,
  onSelect: (id: string) => void
) {
  const context = useContext(MobileTabBarContext)
  const setConfig = context?.setConfig

  // Keep the handler out of the effect's dependencies so a new inline callback
  // on every render does not thrash the registration.
  const stableSelect = useCallback((id: string) => onSelect(id), [onSelect])

  useEffect(() => {
    if (!setConfig) return
    setConfig({ items, activeId, onSelect: stableSelect })
    return () => setConfig(null)
  }, [setConfig, items, activeId, stableSelect])
}
