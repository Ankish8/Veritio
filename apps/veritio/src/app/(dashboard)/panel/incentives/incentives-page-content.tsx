/**
 * Incentives Page Content - Server Component
 *
 * Fetches distributions and stats directly from Supabase, bypassing
 * Motia IPC overhead. Data is passed to the client via SWR fallback cache.
 */

import 'server-only'
import { getPanelContext } from '@/lib/server/panel-context'
import { IncentivesClientWrapper } from './incentives-client-wrapper'
import { createPanelIncentiveService } from '@/services/panel/index'

export async function IncentivesPageContent() {
  const ctx = await getPanelContext()

  if (!ctx) {
    return <IncentivesClientWrapper swrFallback={{}} />
  }

  const { userId, organizationId, supabase } = ctx

  const incentiveService = createPanelIncentiveService(supabase as any)

  const [distributions, stats] = await Promise.all([
    incentiveService.listDistributions(userId, organizationId, {}, { page: 1, limit: 50 }).catch(() => null),
    incentiveService.getUserStats(userId, organizationId).catch(() => null),
  ])

  const swrFallback: Record<string, unknown> = {}

  if (distributions) {
    // Key must match what useIncentiveDistributions builds with default options:
    // organizationId + page=1 + limit=50 (no sort_by/sort_order/status when not provided)
    swrFallback[`/api/panel/incentives?organizationId=${organizationId}&page=1&limit=50`] = distributions
  }

  if (stats) {
    swrFallback[`/api/panel/incentives/stats?organizationId=${organizationId}`] = stats
  }

  return <IncentivesClientWrapper swrFallback={swrFallback} />
}
