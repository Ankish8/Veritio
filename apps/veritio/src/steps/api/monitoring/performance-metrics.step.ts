import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import {
  getStorageMetrics,
  getQueryPerformanceMetrics,
} from '../../../services/performance-monitoring-service'

const responseSchema = z.object({
  storage: z.object({
    total_size_bytes: z.number(),
    recordings_size_bytes: z.number(),
    yjs_documents_size_bytes: z.number(),
    chunk_etags_size_bytes: z.number(),
    largest_tables: z.array(
      z.object({
        table_name: z.string(),
        size_bytes: z.number(),
      })
    ),
  }),
  queries: z.object({
    slow_queries: z.array(
      z.object({
        query: z.string(),
        avg_duration_ms: z.number(),
        call_count: z.number(),
      })
    ),
    table_scan_stats: z.array(
      z.object({
        table_name: z.string(),
        seq_scan_count: z.number(),
        idx_scan_count: z.number(),
        ratio: z.number().nullable(),
      })
    ),
  }),
  timestamp: z.string(),
})

export const config = {
  name: 'GetPerformanceMetrics',
  description: 'Get database storage and query performance metrics',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/monitoring/performance-metrics',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (_req: ApiRequest, { logger }: ApiHandlerContext) => {
  logger.info('Fetching performance metrics')

  const supabase = getMotiaSupabaseClient()

  try {
    const [storage, queries] = await Promise.all([
      getStorageMetrics(supabase),
      getQueryPerformanceMetrics(supabase),
    ])

    return {
      status: 200,
      body: {
        storage,
        queries,
        timestamp: new Date().toISOString(),
      },
    }
  } catch (error) {
    logger.error('Failed to fetch performance metrics', { error })
    return {
      status: 500,
      body: { error: 'Failed to fetch performance metrics' },
    }
  }
}
