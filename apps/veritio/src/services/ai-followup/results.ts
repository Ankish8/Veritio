import type { AiFollowupEntry } from '../../lib/ai-followup/format'
import { fetchAllRows } from '../results/pagination'

type Logger = Parameters<typeof fetchAllRows>[4]

interface FollowupQuestionRow extends Record<string, unknown> {
  id: string
  participant_id: string
  parent_question_id: string
  question_text: string
  trigger_reason: string | null
  position: number
  model_used: string
  followup_question_type: string
  followup_question_config: AiFollowupEntry['followup_question_config']
  created_at: string
}

interface FollowupResponseRow extends Record<string, unknown> {
  id: string
  followup_question_id: string
  response_value: Record<string, unknown> | null
  response_time_ms: number | null
  created_at: string
}

/**
 * Every AI follow-up asked in a study, with its answer and parent question
 * text, oldest first. Pages through both tables: a study easily passes
 * PostgREST's 1000-row default, and an .in() over thousands of ids would
 * overflow the request URL.
 */
export async function getAiFollowupEntries(
  supabase: unknown,
  studyId: string,
  logger?: Logger
): Promise<AiFollowupEntry[]> {
  // ai_followup_* tables are not in every client's generated types.
  const client = supabase as any
  const [followups, responses] = await Promise.all([
    fetchAllRows<FollowupQuestionRow>(client, 'ai_followup_questions', studyId, { cursorColumn: 'id' }, logger),
    fetchAllRows<FollowupResponseRow>(client, 'ai_followup_responses', studyId, { cursorColumn: 'id' }, logger),
  ])
  if (followups.length === 0) return []

  const parentIds = [...new Set(followups.map((f) => f.parent_question_id))]
  const { data: parents } = await client
    .from('study_flow_questions')
    .select('id, question_text')
    .eq('study_id', studyId)
    .in('id', parentIds) as { data: { id: string; question_text: string }[] | null }
  const parentText = new Map((parents ?? []).map((q) => [q.id, q.question_text]))
  const responseByQuestion = new Map(responses.map((r) => [r.followup_question_id, r]))

  return followups
    .map((f) => ({
      ...f,
      parent_question_text: parentText.get(f.parent_question_id) ?? null,
      response: responseByQuestion.get(f.id) ?? null,
    }))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
}
