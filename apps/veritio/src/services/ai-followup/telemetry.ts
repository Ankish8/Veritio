import { getPostHogClient } from '../../lib/posthog'
import type { FollowupOutcome } from './generate'
import { countWords } from './rules'

/**
 * Product metrics for AI follow-up probing. Events are anonymous (no person
 * profile) and carry no participant text, only sizes and outcomes, so they can
 * answer "is probing useful" without exporting research data:
 *   - how often each question type is probed, skipped or judged complete
 *   - how often the template fallback or the OpenAI fallback is used
 *   - how long probe answers are, and how often participants leave them empty
 * No-op when POSTHOG_API_KEY is unset.
 */

interface EvaluatedEvent {
  studyId: string
  questionType: string
  position: number
  format: string
  preview: boolean
  latencyMs: number
  outcome: FollowupOutcome | { kind: 'skipped'; reason: 'max_reached' }
}

export function captureFollowupEvaluated(event: EvaluatedEvent): void {
  const { outcome } = event
  getPostHogClient()?.capture({
    distinctId: `study:${event.studyId}`,
    event: 'ai followup evaluated',
    properties: {
      $process_person_profile: false,
      study_id: event.studyId,
      question_type: event.questionType,
      followup_position: event.position,
      followup_format: event.format,
      preview: event.preview,
      latency_ms: event.latencyMs,
      outcome: outcome.kind,
      reason: 'reason' in outcome ? outcome.reason : null,
      model: 'model' in outcome ? outcome.model : null,
      required: outcome.kind === 'asked' ? outcome.required : null,
    },
  })
}

interface AnsweredEvent {
  studyId: string
  followupType: string
  modelUsed: string
  answerText: string
  skipped: boolean
  responseTimeMs: number | null
}

export function captureFollowupAnswered(event: AnsweredEvent): void {
  const words = countWords(event.answerText)
  getPostHogClient()?.capture({
    distinctId: `study:${event.studyId}`,
    event: 'ai followup answered',
    properties: {
      $process_person_profile: false,
      study_id: event.studyId,
      followup_type: event.followupType,
      model: event.modelUsed,
      answer_words: words,
      empty: words === 0,
      skipped: event.skipped,
      response_time_ms: event.responseTimeMs,
    },
  })
}
