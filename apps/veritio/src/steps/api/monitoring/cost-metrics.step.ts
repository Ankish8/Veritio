import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getStorageMetrics } from '../../../services/performance-monitoring-service'
import { getCostMetrics } from '../../../services/cost-estimation-service'

const optimizationSchema = z.object({
  phase: z.string(),
  storage_before_gb: z.number(),
  storage_after_gb: z.number(),
  cost_before: z.number(),
  cost_after: z.number(),
  monthly_savings: z.number(),
  percentage_saved: z.number(),
  optimizations_applied: z.array(z.string()),
})

const costBreakdownSchema = z.object({
  category: z.string(),
  size_gb: z.number(),
  cost_per_month: z.number(),
  percentage: z.number(),
})

const costEstimateSchema = z.object({
  database_storage_gb: z.number(),
  database_cost_per_month: z.number(),
  r2_storage_gb: z.number(),
  r2_cost_per_month: z.number(),
  total_monthly_cost: z.number(),
  cost_breakdown: z.array(costBreakdownSchema),
})

const responseSchema = z.object({
  current_costs: costEstimateSchema,
  baseline_costs: costEstimateSchema.nullable(),
  total_savings: z.number(),
  savings_by_phase: z.array(optimizationSchema),
  storage_trend: z.array(
    z.object({
      date: z.string(),
      size_gb: z.number(),
      estimated_cost: z.number(),
    })
  ),
  timestamp: z.string(),
})

export const config = {
  name: 'GetCostMetrics',
  description: 'Get database cost estimates and optimization savings',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/monitoring/cost-metrics',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['cost-tracking'],
} satisfies StepConfig

export const handler = async (_req: ApiRequest, { logger }: ApiHandlerContext) => {
  logger.info('Fetching cost metrics')

  const supabase = getMotiaSupabaseClient()

  try {
    const storage = await getStorageMetrics(supabase)
    const costMetrics = await getCostMetrics(supabase, storage)

    return {
      status: 200,
      body: {
        ...costMetrics,
        timestamp: new Date().toISOString(),
      },
    }
  } catch (error) {
    logger.error('Failed to fetch cost metrics', { error })
    return {
      status: 500,
      body: { error: 'Failed to fetch cost metrics' },
    }
  }
}
