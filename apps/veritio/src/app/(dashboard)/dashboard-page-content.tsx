/**
 * Dashboard server component — prefetches dashboard stats from Supabase
 * and seeds SWR cache for instant first paint.
 */

import 'server-only'
import { getPanelContext } from '@/lib/server/panel-context'
import { getServerSession } from '@veritio/auth/server'
import { DashboardClientWrapper } from './dashboard-client-wrapper'
import { getDashboardStats, getRecentStudies, getProjectList } from '@/services/dashboard-service'
import { SWR_KEYS } from '@/lib/swr'

export async function DashboardPageContent() {
  let ctx
  try {
    ctx = await getPanelContext()
  } catch {
    return <DashboardClientWrapper swrFallback={{}} organizationId="" userName={null} />
  }

  if (!ctx) {
    return <DashboardClientWrapper swrFallback={{}} organizationId="" userName={null} />
  }

  const { userId, organizationId, supabase } = ctx
  const session = await getServerSession()
  const userName = session?.user?.name ?? null

  // Fetch all dashboard data in parallel — same queries as the Motia step
  const [statsResult, recentResult, projectListResult] = await Promise.all([
    getDashboardStats(supabase as any, userId, organizationId).catch(() => ({ data: null, error: new Error('failed') })),
    getRecentStudies(supabase as any, userId, 10, organizationId).catch(() => ({ data: null, error: new Error('failed') })),
    getProjectList(supabase as any, userId, organizationId).catch(() => ({ data: null, error: new Error('failed') })),
  ])

  const swrFallback: Record<string, unknown> = {}

  // Only seed cache if we got valid data
  if (statsResult.data || recentResult.data) {
    swrFallback[SWR_KEYS.dashboard(organizationId)] = {
      stats: statsResult.data ?? {
        totalProjects: 0,
        totalStudies: 0,
        activeStudies: 0,
        totalParticipants: 0,
      },
      recentStudies: recentResult.data ?? [],
      projects: projectListResult.data ?? [],
    }
  }

  return (
    <DashboardClientWrapper swrFallback={swrFallback} organizationId={organizationId} userName={userName} />
  )
}
