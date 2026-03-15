'use client'

import { useCurrentOrganizationId } from '@/stores/collaboration-store'
import { useRealtimeDashboard } from '@/hooks/use-realtime-dashboard'

/** Wires Supabase Realtime → SWR cache invalidation for the entire dashboard. */
export function RealtimeDashboardBridge() {
  const organizationId = useCurrentOrganizationId()
  useRealtimeDashboard(organizationId)
  return null
}
