import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const jobSchema = z.object({
  id: z.string().uuid(),
  study_id: z.string().uuid(),
  user_id: z.string(),
  integration: z.string(),
  format: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  progress: z.any(),
  destination_url: z.string().nullable(),
  error_message: z.string().nullable(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
})

const responseSchema = z.object({
  jobs: z.array(jobSchema),
  total: z.number(),
})

export const config = {
  name: 'ListExportJobs',
  description: 'List export jobs for the current user',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/export-jobs',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['export-lifecycle'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const studyId = req.queryParams?.studyId as string | undefined
  const limit = parseInt((req.queryParams?.limit as string) || '20', 10)
  const offset = parseInt((req.queryParams?.offset as string) || '0', 10)

  logger.info('Listing export jobs', { userId, studyId, limit, offset })

  const supabase = getMotiaSupabaseClient()

  // Build query
  let query = (supabase as any)
    .from('export_jobs')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Filter by study if provided
  if (studyId) {
    query = query.eq('study_id', studyId)
  }

  const { data: jobs, error: fetchError, count } = await query

  if (fetchError) {
    logger.error('Failed to fetch export jobs', { error: fetchError.message })
    return {
      status: 500,
      body: { error: 'Failed to fetch export jobs' },
    }
  }

  logger.info('Export jobs listed', { count: jobs?.length || 0, total: count || 0 })

  return {
    status: 200,
    body: {
      jobs: jobs || [],
      total: count || 0,
    },
  }
}
