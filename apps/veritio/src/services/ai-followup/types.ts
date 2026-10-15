import type { AiFollowupConfig, FollowupQuestionConfig, FollowupQuestionType } from '@veritio/study-types'

/** Trusted study context, loaded from the database (never from the request). */
export interface FollowupStudyContext {
  title: string
  purpose?: string | null
  description?: string | null
  language?: string | null
}

/** Trusted parent-question context, loaded from the database. */
export interface FollowupParentQuestion {
  text: string
  type: string
  config: Record<string, unknown> & { aiFollowup?: AiFollowupConfig }
}

/** One probe already asked for this parent question, with the participant's reply. */
export interface FollowupTurn {
  question: string
  answer: string
}

/**
 * Structured answer data sent by the player. Every field is optional because
 * older player bundles send less, and none of it is trusted for authorization.
 */
export interface FollowupResponseContext {
  value?: number
  selectedOptionIds?: string[]
  isOtherSelected?: boolean
  otherText?: string
}

export interface FollowupEvaluationInput {
  study: FollowupStudyContext
  question: FollowupParentQuestion
  /** Human-readable original answer (e.g. "Rated 4 out of 10", or the typed text). */
  answerText: string
  responseContext: FollowupResponseContext
  /** Probes already asked for this question, oldest first. Empty for the first probe. */
  thread: FollowupTurn[]
}

export type FollowupDecision =
  | { kind: 'skip'; reason: string }
  | {
      kind: 'ask'
      /** The researcher's rules require a probe here; the model may not decline. */
      mustAsk: boolean
      /** Short description of why this answer is worth probing, shown to the model and stored. */
      signal: string
      /** Used when a probe is required but the model is unavailable or declines. */
      fallbackQuestion: string | null
    }

export interface GeneratedFollowup {
  question: string
  triggerReason: string
  followupType: FollowupQuestionType
  followupConfig: FollowupQuestionConfig | null
  modelUsed: string
}
