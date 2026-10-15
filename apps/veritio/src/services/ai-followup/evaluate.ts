import { getOrgIdForStudy, hasFeature } from '../entitlements-service'
import type { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import { createFollowupCompletion } from './completion'
import { loadFollowupContext, maxFollowupsFor, parseResponseContext, type LoadedFollowupContext } from './context'
import { generateFollowup } from './generate'
import { captureFollowupEvaluated } from './telemetry'
import type { FollowupTurn, GeneratedFollowup } from './types'

interface EvaluateLogger {
  warn: (message: string, meta?: Record<string, unknown>) => void
}

export interface EvaluateFollowupParams {
  supabase: ReturnType<typeof getMotiaSupabaseClient>
  studyId: string
  questionId: string
  /** Quota bucket for this caller: a participant id, or `preview:<userId>`. */
  quotaKey: string
  responseContext: string | undefined
  /**
   * Build the probe history for this caller. The participant path pairs stored
   * probes with the player's replies; preview has no stored rows. Return the
   * thread and the original answer text.
   */
  resolveThread: (context: LoadedFollowupContext) => Promise<{ thread: FollowupTurn[]; answerText: string }>
  logger: EvaluateLogger
  /** Researcher preview: tagged in metrics so it does not skew participant numbers. */
  preview?: boolean
}

export interface EvaluatedFollowup {
  followup: GeneratedFollowup
  /** 1-based position of this probe for the parent question. */
  position: number
}

/**
 * The shared path behind the participant and preview endpoints: plan gate,
 * trusted context, the max-follow-ups cap, then decide-and-write. Resolves to
 * null for "no follow-up" (plan, probing off, cap reached, or nothing to ask).
 */
export async function evaluateFollowup(params: EvaluateFollowupParams): Promise<EvaluatedFollowup | null> {
  const { supabase, studyId, questionId, quotaKey, logger } = params

  const orgId = await getOrgIdForStudy(supabase, studyId)
  if (!orgId || !(await hasFeature(supabase, orgId, 'aiFollowUp'))) return null

  const context = await loadFollowupContext(supabase, studyId, questionId)
  if (!context) return null

  const { thread, answerText } = await params.resolveThread(context)
  const startedAt = Date.now()
  const report = (outcome: Parameters<typeof captureFollowupEvaluated>[0]['outcome']) =>
    captureFollowupEvaluated({
      studyId,
      questionType: context.question.type,
      position: thread.length + 1,
      format: context.aiConfig.followupFormat ?? 'open',
      preview: !!params.preview,
      latencyMs: Date.now() - startedAt,
      outcome,
    })

  if (thread.length >= maxFollowupsFor(context.aiConfig)) {
    report({ kind: 'skipped', reason: 'max_reached' })
    return null
  }

  const followup = await generateFollowup(
    {
      study: context.study,
      question: context.question,
      answerText,
      responseContext: parseResponseContext(params.responseContext),
      thread,
    },
    {
      complete: (messages, maxOutputTokens) =>
        createFollowupCompletion({ organizationId: orgId, studyId, participantId: quotaKey }, messages, maxOutputTokens, logger),
      onError: (error) => logger.warn('AI followup model call failed', { error, studyId }),
      onOutcome: report,
    }
  )
  return followup ? { followup, position: thread.length + 1 } : null
}
