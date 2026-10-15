import type { AiFollowupFormat, FollowupQuestionConfig, FollowupQuestionType } from '@veritio/study-types'

const MAX_QUESTION_CHARS = 300
const MAX_OPTION_CHARS = 80
const MAX_OPTIONS = 6

export interface ParsedFollowup {
  question: string
  reason: string | null
  followupType: FollowupQuestionType
  followupConfig: FollowupQuestionConfig | null
}

/**
 * Parse and validate the model's JSON. Returns null when the model declined or
 * produced something unusable (bad JSON, empty, overlong, or a repeat of a
 * question already asked). In 'open' format every follow-up is coerced to text.
 */
export function parseFollowupResponse(
  content: string,
  format: AiFollowupFormat,
  previousQuestions: string[]
): ParsedFollowup | null {
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(content) as Record<string, unknown>
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || parsed.f !== true) return null

  const question = typeof parsed.q === 'string' ? tidy(parsed.q) : ''
  if (!question || question.length > MAX_QUESTION_CHARS) return null
  // A question cut off by the token limit does not end in a question mark.
  if (!/[?？؟]$/.test(question)) return null
  if (previousQuestions.some((prev) => normalize(prev) === normalize(question))) return null

  const reason = typeof parsed.r === 'string' && parsed.r.trim() ? parsed.r.trim().slice(0, 200) : null
  const text: ParsedFollowup = { question, reason, followupType: 'text', followupConfig: null }

  if (format === 'open') return text

  switch (parsed.t) {
    case 'mc': {
      const labels = Array.isArray(parsed.opts)
        ? parsed.opts
            .filter((o): o is string => typeof o === 'string')
            .map((o) => o.trim())
            .filter((o) => o.length > 0 && o.length <= MAX_OPTION_CHARS)
        : []
      const unique = [...new Set(labels)].slice(0, MAX_OPTIONS)
      if (unique.length < 2) return text
      return {
        question,
        reason,
        followupType: 'multiple_choice',
        followupConfig: { options: unique.map((label, i) => ({ id: `opt_${i}`, label })) },
      }
    }
    case 'os': {
      const points = typeof parsed.sp === 'number' ? Math.round(parsed.sp) : 5
      return {
        question,
        reason,
        followupType: 'opinion_scale',
        followupConfig: {
          scalePoints: Math.min(7, Math.max(3, points)),
          leftLabel: labelOr(parsed.ll, 'Not at all'),
          rightLabel: labelOr(parsed.rl, 'Very much'),
        },
      }
    }
    case 'yn':
      return { question, reason, followupType: 'yes_no', followupConfig: null }
    default:
      return text
  }
}

/** Trim, and swap em/en dashes for commas: participant-facing copy avoids them. */
function tidy(text: string): string {
  return text.replace(/\s*[—–]\s*/g, ', ').replace(/\s+/g, ' ').trim()
}

function labelOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 40) : fallback
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}
