/**
 * Shared shape and formatting for stored AI follow-ups, used by the results
 * panel, the CSV export and the insights report so all three read the same.
 */

export interface AiFollowupEntry {
  id: string
  participant_id: string
  parent_question_id: string
  /** Added by GET /ai-followups; absent if the parent question was deleted. */
  parent_question_text?: string | null
  question_text: string
  trigger_reason: string | null
  position: number
  model_used: string
  created_at: string
  followup_question_type?: string
  followup_question_config?: {
    options?: { id: string; label: string }[]
    scalePoints?: number
    leftLabel?: string
    rightLabel?: string
  } | null
  response: {
    id?: string
    response_value: Record<string, unknown> | null
    response_time_ms: number | null
    created_at?: string
  } | null
}

/** The participant pressed "Skip this question" instead of answering. */
export function isFollowupSkipped(entry: Pick<AiFollowupEntry, 'response'>): boolean {
  return entry.response?.response_value?.skipped === true
}

export interface FollowupStats {
  asked: number
  answered: number
  skipped: number
  /** Shown but no answer saved (participant left, or an older player). */
  unanswered: number
}

export function followupStats(entries: AiFollowupEntry[]): FollowupStats {
  let answered = 0
  let skipped = 0
  for (const entry of entries) {
    if (isFollowupSkipped(entry)) skipped++
    else if (formatFollowupAnswer(entry).trim()) answered++
  }
  return { asked: entries.length, answered, skipped, unanswered: entries.length - answered - skipped }
}

/** Human-readable answer to a follow-up, or '' when there is none (or it was skipped). */
export function formatFollowupAnswer(entry: Pick<AiFollowupEntry, 'response' | 'followup_question_type' | 'followup_question_config'>): string {
  const val = entry.response?.response_value
  if (!val || val.skipped === true) return ''
  const type = entry.followup_question_type || 'text'

  switch (type) {
    case 'multiple_choice': {
      const optionId = (val.optionId as string | undefined) ?? (val.text as string | undefined)
      const match = entry.followup_question_config?.options?.find((o) => o.id === optionId)
      return match?.label ?? (optionId ? String(optionId) : '')
    }
    case 'opinion_scale': {
      const rating = val.rating ?? val.value ?? val.text
      const scalePoints = entry.followup_question_config?.scalePoints ?? 5
      return rating != null ? `${rating} / ${scalePoints}` : ''
    }
    case 'yes_no': {
      const answer = val.answer ?? val.value ?? val.text
      if (answer === true || answer === 'true' || answer === 'yes') return 'Yes'
      if (answer === false || answer === 'false' || answer === 'no') return 'No'
      return answer != null ? String(answer) : ''
    }
    default:
      return typeof val.text === 'string' ? val.text : ''
  }
}
