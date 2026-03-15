'use client'

import { SWRConfig } from 'swr'
import { DashboardClient } from './dashboard-client'

interface DashboardClientWrapperProps {
  swrFallback: Record<string, unknown>
  organizationId: string
  userName: string | null
}

export function DashboardClientWrapper({ swrFallback, organizationId, userName }: DashboardClientWrapperProps) {
  return (
    <SWRConfig value={{ fallback: swrFallback }}>
      <DashboardClient organizationId={organizationId || undefined} userName={userName} />
    </SWRConfig>
  )
}
