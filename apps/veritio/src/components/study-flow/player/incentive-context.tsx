'use client'

// Incentives are widget-exclusive. Only participants who entered
// via the widget (utm_source=widget or embed-code-id) should see incentive info.

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { IncentiveDisplayConfig } from '@/lib/utils/format-incentive'

interface IncentiveContextValue {
  config: IncentiveDisplayConfig | null
  isWidgetParticipant: boolean
}

const IncentiveContext = createContext<IncentiveContextValue>({
  config: null,
  isWidgetParticipant: false,
})

interface IncentiveProviderProps {
  config: IncentiveDisplayConfig | null
  isWidgetParticipant?: boolean
  children: ReactNode
}

export function IncentiveProvider({ config, isWidgetParticipant = false, children }: IncentiveProviderProps) {
  const value = useMemo(() => ({
    config,
    isWidgetParticipant,
  }), [config, isWidgetParticipant])

  return (
    <IncentiveContext.Provider value={value}>
      {children}
    </IncentiveContext.Provider>
  )
}

export function useIncentiveConfig(): IncentiveDisplayConfig | null {
  const { config, isWidgetParticipant } = useContext(IncentiveContext)
  // Only return config if participant came from widget
  return isWidgetParticipant ? config : null
}

export function useIsWidgetParticipant(): boolean {
  return useContext(IncentiveContext).isWidgetParticipant
}
