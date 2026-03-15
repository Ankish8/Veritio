import type { StepConfig } from 'motia'
import type { EventHandlerContext } from '../../lib/motia/types'
import { createMotiaSupabaseClient } from '../../lib/supabase/motia-client'

export const config = {
  name: 'RefreshDashboardStats',
  description: 'Refresh materialized views for dashboard stats',
  triggers: [{ type: 'cron', expression: '0 */15 * * * * *' }],
  enqueues: [],
  flows: ['monitoring'],
} satisfies StepConfig

// Module-level singleton — materialized view refresh is inherently slow (500-700ms).
// Higher threshold avoids noisy warnings for expected background cron behavior.
const supabase = createMotiaSupabaseClient({ slowQueryThresholdMs: 2000 })

export const handler = async (_input: unknown, { logger }: EventHandlerContext) => {

  const start = Date.now()

  const { error } = await supabase.rpc('refresh_dashboard_materialized_views' as any)

  if (error) {
    logger.error('Failed to refresh dashboard views', { error })
    return
  }

  logger.info('Refreshed dashboard views', { duration_ms: Date.now() - start })
}
