import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getLinkAnalytics } from '../../../services/link-analytics-service'

/**
 * Get Link Analytics API
 *
 * Authenticated endpoint for retrieving link analytics for a study.
 * Returns summary stats, source breakdown, and UTM campaign data.
 */

const responseSchema = z.object({
  totalViews: z.number(),
  totalStarts: z.number(),
  totalCompletions: z.number(),
  sourceBreakdown: z.array(
    z.object({
      source: z.string(),
      views: z.number(),
      starts: z.number(),
      completions: z.number(),
    })
  ),
  utmCampaigns: z.array(
    z.object({
      campaign: z.string(),
      source: z.string(),
      medium: z.string(),
      views: z.number(),
      completions: z.number(),
    })
  ),
})

export const config = {
  name: 'GetLinkAnalytics',
  description: 'Get link analytics for a study',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/analytics/links',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['analytics'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId } = req.pathParams

  const supabase = getMotiaSupabaseClient()

  // Verify user has access to this study
  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, user_id')
    .eq('id', studyId)
    .single()

  if (studyError || !study) {
    logger.warn('Study not found for analytics', { studyId, userId })
    return {
      status: 404,
      body: { error: 'Study not found' },
    }
  }

  if (study.user_id !== userId) {
    logger.warn('Unauthorized analytics access attempt', { studyId, userId })
    return {
      status: 403,
      body: { error: 'Access denied' },
    }
  }

  const result = await getLinkAnalytics(supabase, studyId)

  if (result.error || !result.data) {
    logger.error('Failed to get link analytics', { error: result.error, studyId })
    return {
      status: 500,
      body: { error: 'Failed to retrieve analytics' },
    }
  }

  return {
    status: 200,
    body: result.data,
  }
}
