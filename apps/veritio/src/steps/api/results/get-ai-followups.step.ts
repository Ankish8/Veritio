import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyViewer } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

interface AiFollowupQuestion {
  id: string
  study_id: string
  participant_id: string
  parent_question_id: string
  question_text: string
  trigger_reason: string | null
  position: number
  model_used: string
  followup_question_type: string
  followup_question_config: Record<string, unknown> | null
  created_at: string
}

interface AiFollowupResponse {
  id: string
  followup_question_id: string
  participant_id: string
  study_id: string
  response_value: Record<string, unknown>
  response_time_ms: number | null
  created_at: string
}

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
  const supabase = getMotiaSupabaseClient()

  // Get all follow-up questions with their responses
  const { data: followups, error } = await supabase
    .from('ai_followup_questions' as any)
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: true }) as unknown as { data: AiFollowupQuestion[] | null; error: any }

  if (error) {
    logger.error('Failed to fetch AI followups', { error })
    return { status: 500, body: { error: 'Failed to fetch followups' } }
  }

  if (!followups || followups.length === 0) {
    return { status: 200, body: { followups: [] } }
  }

  const followupIds = followups.map((f) => f.id)

  const { data: responses } = await supabase
    .from('ai_followup_responses' as any)
    .select('*')
    .in('followup_question_id', followupIds) as unknown as { data: AiFollowupResponse[] | null }

  // Join responses to questions
  const responseMap = new Map<string, any>()
  for (const r of responses ?? []) {
    responseMap.set(r.followup_question_id, r)
  }

  const result = followups.map((fq) => ({
    ...fq,
    response: responseMap.get(fq.id) ?? null,
  }))

  // Group by parent_question_id
  const grouped: Record<string, typeof result> = {}
  for (const item of result) {
    const key = item.parent_question_id
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(item)
  }

  return { status: 200, body: { followups: grouped } }
}
