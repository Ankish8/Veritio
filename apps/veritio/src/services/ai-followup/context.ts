import type { AiFollowupConfig } from '@veritio/study-types'
import type { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { FollowupParentQuestion, FollowupResponseContext, FollowupStudyContext, FollowupTurn } from './types'

type Supabase = ReturnType<typeof getMotiaSupabaseClient>

export interface LoadedFollowupContext {
  study: FollowupStudyContext
  question: FollowupParentQuestion
  aiConfig: AiFollowupConfig
}

/**
 * Load the parent question and study from the database. The question text,
 * type and AI settings (probing focus, trigger rules, max follow-ups) are taken
 * from here, never from the request, so a participant cannot steer them.
 * Returns null when the question is not in the study or probing is off.
 */
export async function loadFollowupContext(
  supabase: Supabase,
  studyId: string,
  questionId: string
): Promise<LoadedFollowupContext | null> {
  const [{ data: question }, { data: study }] = await Promise.all([
    supabase
      .from('study_flow_questions')
      .select('id, question_text, question_type, config')
      .eq('id', questionId)
      .eq('study_id', studyId)
      .maybeSingle(),
    supabase
      .from('studies')
      .select('title, purpose, description, language')
      .eq('id', studyId)
      .maybeSingle(),
  ])

  if (!question || !study) return null

  const config = (question.config && typeof question.config === 'object' && !Array.isArray(question.config)
    ? question.config
    : {}) as FollowupParentQuestion['config']
  const aiConfig = config.aiFollowup
  if (!aiConfig?.enabled) return null

  return {
    study: {
      title: study.title,
      purpose: study.purpose,
      description: study.description,
      language: study.language,
    },
    question: { text: question.question_text, type: question.question_type, config },
    aiConfig,
  }
}

export function maxFollowupsFor(aiConfig: AiFollowupConfig): number {
  return aiConfig.maxFollowups === 1 ? 1 : 2
}

/** Parse the player's JSON response context. Unknown or malformed input yields {}. */
export function parseResponseContext(raw: string | undefined): FollowupResponseContext {
  if (!raw) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (typeof parsed === 'number') return { value: parsed }
  if (!parsed || typeof parsed !== 'object') return {}

  const obj = parsed as Record<string, unknown>
  const context: FollowupResponseContext = {}
  if (typeof obj.value === 'number' && Number.isFinite(obj.value)) context.value = obj.value
  if (Array.isArray(obj.selectedOptionIds)) {
    context.selectedOptionIds = obj.selectedOptionIds.filter((id): id is string => typeof id === 'string').slice(0, 50)
  }
  if (typeof obj.isOtherSelected === 'boolean') context.isOtherSelected = obj.isOtherSelected
  if (typeof obj.otherText === 'string') context.otherText = obj.otherText.slice(0, 1000)
  return context
}

/**
 * Pair the probes already stored for this participant with the replies the
 * player sent. Probe wording comes from the database; only the replies come
 * from the request. Older players sent the probe reply as `answer` with no
 * thread, so that shape is mapped onto the last stored probe.
 */
export function buildFollowupThread(
  askedQuestions: string[],
  answer: string | undefined,
  clientThread: { answer: string }[] | undefined
): { thread: FollowupTurn[]; answerText: string } {
  const replies = clientThread ?? []
  if (askedQuestions.length === 0) {
    return { thread: [], answerText: answer ?? '' }
  }
  if (replies.length === 0) {
    const thread = askedQuestions.map((question, i) => ({
      question,
      answer: i === askedQuestions.length - 1 ? answer ?? '' : '',
    }))
    return { thread, answerText: '(not available)' }
  }
  const thread = askedQuestions.map((question, i) => ({ question, answer: replies[i]?.answer ?? '' }))
  return { thread, answerText: answer ?? '' }
}
