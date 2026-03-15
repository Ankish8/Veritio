import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

/**
 * Internal API endpoint to synchronously refresh dashboard stats materialized view.
 *
 * This is called by the frontend BEFORE invalidating SWR cache to ensure
 * that the materialized view is fresh when SWR refetches data.
 *
 * This prevents the race condition where:
 * 1. Study is created/deleted
 * 2. SWR cache is invalidated
 * 3. SWR refetches and gets stale data from materialized view
 * 4. Materialized view is refreshed (too late - SWR already cached stale data)
 */

export const config = {
  name: 'RefreshDashboardStats',
  description: 'Refresh materialized views for dashboard stats (internal endpoint)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/internal/refresh-dashboard-stats',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: z.object({ success: z.boolean(), duration_ms: z.number() }) as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['dashboard'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string

  logger.info('Refreshing dashboard materialized views', { userId, source: 'api' })

  const supabase = getMotiaSupabaseClient()

  const startTime = Date.now()

  try {
    const { error } = await supabase.rpc('refresh_dashboard_materialized_views' as any)

    if (error) {
      logger.error('Failed to refresh dashboard materialized views', {
        userId,
        error: error.message,
      })
      return {
        status: 500,
        body: { error: 'Failed to refresh dashboard stats' },
      }
    }

    const durationMs = Date.now() - startTime

    logger.info('Dashboard materialized views refreshed', {
      userId,
      duration_ms: durationMs,
      source: 'api',
    })

    return {
      status: 200,
      body: {
        success: true,
        duration_ms: durationMs,
      },
    }
  } catch (error) {
    logger.error('Error refreshing dashboard stats', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return {
      status: 500,
      body: { error: 'Failed to refresh dashboard stats' },
    }
  }
}
