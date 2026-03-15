import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { toggleParticipantExclusion } from '../../../services/participant-exclusion-service'

const bodySchema = z.object({
  participantIds: z.array(z.string().uuid()).min(1).max(500),
  exclude: z.boolean(),
})

export const config = {
  name: 'BulkToggleExcludeParticipants',
  description: 'Bulk toggle exclusion status for multiple participants',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/participants/bulk-toggle-exclude',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: ['participant-exclusion-toggled'],
  flows: ['results-analysis'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (
  req: ApiRequest,
  { logger, enqueue }: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const { participantIds, exclude } = bodySchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()

  const result = await toggleParticipantExclusion(
    supabase,
    params.studyId,
    participantIds,
    exclude,
  )

  if (!result.success) {
    const isBadRequest = result.error === 'No valid participants found for this study'
    logger.error('Bulk participant exclusion toggle failed', {
      studyId: params.studyId,
      error: result.error,
    })
    return {
      status: isBadRequest ? 400 : 500,
      body: { error: result.error ?? 'Failed to update exclusion status' },
    }
  }

  logger.info('Bulk participant exclusion toggled', {
    studyId: params.studyId,
    count: result.updatedCount,
    exclude,
  })

  enqueue({
    topic: 'participant-exclusion-toggled',
    data: {
      resourceType: 'participant',
      action: 'bulk-toggle-exclude',
      studyId: params.studyId,
      participantIds,
      exclude,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: {
      success: true,
      updatedCount: result.updatedCount,
      exclude,
    },
  }
}
