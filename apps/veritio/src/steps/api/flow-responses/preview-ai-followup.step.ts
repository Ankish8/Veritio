import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyViewer } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { rateLimitMiddleware } from '../../../middlewares/rate-limit'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { evaluateFollowup } from '../../../services/ai-followup'

/**
 * Researcher preview of AI follow-up probing. Same decision and prompt as the
 * participant endpoint, but authenticated as a study member, with nothing
 * written to the database. The preview player has no real participant row.
 */
const bodySchema = z.object({
  questionId: z.string().uuid(),
  answer: z.string().max(4000).optional(),
  responseContext: z.string().max(8000).optional(),
  thread: z
    .array(z.object({ question: z.string().max(500), answer: z.string().max(4000) }))
    .max(1)
    .optional(),
})

export const config = {
  name: 'PreviewAiFollowup',
  triggers: [{
    type: 'http',
    path: '/api/studies/:studyId/ai-followup-preview',
    method: 'POST',
    middleware: [
      authMiddleware,
      requireStudyViewer('studyId'),
      rateLimitMiddleware({ tier: 'authenticated-mutation' }),
      errorHandlerMiddleware,
    ],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['flow-responses'],
} satisfies StepConfig

const NO_FOLLOWUP = { status: 200, body: { shouldFollowUp: false } } as const

export const handler = async (
  req: ApiRequest<z.infer<typeof bodySchema>, { studyId: string }>,
  { logger }: ApiHandlerContext
) => {
  const body = bodySchema.parse(req.body)
  const { studyId } = req.pathParams
  const userId = req.headers['x-user-id'] as string

  try {
    const supabase = getMotiaSupabaseClient()

    // No stored rows in preview, so the player's thread is the whole history.
    const result = await evaluateFollowup({
      supabase,
      studyId,
      questionId: body.questionId,
      quotaKey: `preview:${userId}`,
      responseContext: body.responseContext,
      logger,
      resolveThread: async () => ({ thread: body.thread ?? [], answerText: body.answer ?? '' }),
    })
    if (!result) return NO_FOLLOWUP
    const { followup } = result

    return {
      status: 200,
      body: {
        shouldFollowUp: true,
        followUpQuestion: followup.question,
        followupQuestionId: null,
        followupType: followup.followupType,
        followupConfig: followup.followupConfig,
      },
    }
  } catch (error) {
    logger.error('AI followup preview failed', { error })
    return NO_FOLLOWUP
  }
}
