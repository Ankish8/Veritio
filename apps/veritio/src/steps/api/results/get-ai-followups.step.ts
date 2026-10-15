import type { StepConfig } from '@/lib/motia/types'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyViewer } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getAiFollowupEntries } from '../../../services/ai-followup/results'
import type { AiFollowupEntry } from '../../../lib/ai-followup/format'

export const config = {
  name: 'GetAiFollowups',
  triggers: [{
    type: 'http',
    path: '/api/studies/:studyId/ai-followups',
    method: 'GET',
    middleware: [authMiddleware, requireStudyViewer('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['results'],
} satisfies StepConfig

export const handler = async (
  req: ApiRequest<unknown, { studyId: string }>,
  { logger }: ApiHandlerContext
) => {
  const { studyId } = req.pathParams

  try {
    const entries = await getAiFollowupEntries(getMotiaSupabaseClient(), studyId, logger)

    // Group by parent question
    const grouped: Record<string, AiFollowupEntry[]> = {}
    for (const entry of entries) {
      ;(grouped[entry.parent_question_id] ??= []).push(entry)
    }

    return { status: 200, body: { followups: grouped } }
  } catch (error) {
    logger.error('Failed to fetch AI followups', { error })
    return { status: 500, body: { error: 'Failed to fetch followups' } }
  }
}
