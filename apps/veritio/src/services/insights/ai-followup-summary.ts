import { formatFollowupAnswer, type AiFollowupEntry } from '../../lib/ai-followup/format'

const MAX_QUESTIONS = 10
const MAX_SAMPLES_PER_QUESTION = 6
const MAX_CHARS = 200

export interface AiFollowupSummary {
  /** Parent question text. */
  question: string
  /** Follow-ups asked / answered for this question across participants. */
  asked: number
  answered: number
  /** Probe and reply pairs, most recent first. */
  samples: { probe: string; answer: string }[]
}

/**
 * Compact AI follow-up evidence for the insights LLM: per parent question,
 * a few probe/answer pairs. These answers carry the "why" behind ratings and
 * choices, which raw distributions cannot.
 */
export function summarizeAiFollowups(
  entries: AiFollowupEntry[],
  participantIds?: Set<string> | null
): AiFollowupSummary[] | undefined {
  const scoped = participantIds ? entries.filter((e) => participantIds.has(e.participant_id)) : entries
  if (scoped.length === 0) return undefined

  const byParent = new Map<string, AiFollowupEntry[]>()
  for (const entry of scoped) {
    const list = byParent.get(entry.parent_question_id) ?? []
    list.push(entry)
    byParent.set(entry.parent_question_id, list)
  }

  return [...byParent.values()]
    .map((list) => {
      const answered = list
        .map((e) => ({ probe: e.question_text, answer: formatFollowupAnswer(e).trim(), at: e.created_at }))
        .filter((s) => s.answer.length > 0)
      return {
        question: clip(stripHtml(list[0].parent_question_text ?? ''), 100),
        asked: list.length,
        answered: answered.length,
        samples: answered
          .sort((a, b) => b.at.localeCompare(a.at))
          .slice(0, MAX_SAMPLES_PER_QUESTION)
          .map((s) => ({ probe: clip(s.probe, MAX_CHARS), answer: clip(s.answer, MAX_CHARS) })),
      }
    })
    .filter((s) => s.answered > 0)
    .sort((a, b) => b.answered - a.answered)
    .slice(0, MAX_QUESTIONS)
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}
