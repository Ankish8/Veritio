import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { toggleParticipantExclusion } from '../../../services/participant-exclusion-service'

const bodySchema = z.object({
  exclude: z.boolean(),
})

export const config = {
  name: 'ToggleExcludeParticipant',
  description: 'Toggle exclusion status for a participant in analysis',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/participants/:participantId/toggle-exclude',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
      200: z.object({ success: z.boolean(), isExcluded: z.boolean() }) as any,
      400: z.object({
        error: z.string(),
        details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
      }) as any,
      404: z.object({ error: z.string() }) as any,
      500: z.object({ error: z.string() }) as any,
    },
  }],
  enqueues: ['participant-exclusion-toggled'],
  flows: ['results-analysis'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
  participantId: z.string().uuid(),
})

export const handler = async (
  req: ApiRequest,
  { logger, enqueue }: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const { exclude } = bodySchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()

  const result = await toggleParticipantExclusion(
    supabase,
    params.studyId,
    [params.participantId],
    exclude,
  )

  if (!result.success) {
    const isNotFound = result.error === 'No valid participants found for this study'
    logger.warn('Participant exclusion toggle failed', {
      studyId: params.studyId,
      participantId: params.participantId,
      error: result.error,
    })
    return {
      status: isNotFound ? 404 : 500,
      body: { error: isNotFound ? 'Participant not found' : (result.error ?? 'Failed to update exclusion status') },
    }
  }

  logger.info('Participant exclusion toggled', {
    studyId: params.studyId,
    participantId: params.participantId,
    exclude,
  })

  enqueue({
    topic: 'participant-exclusion-toggled',
    data: {
      resourceType: 'participant',
      resourceId: params.participantId,
      action: 'toggle-exclude',
      studyId: params.studyId,
      exclude,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: {
      success: true,
      isExcluded: exclude,
    },
  }
}
