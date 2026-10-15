import { parseFollowupResponse } from './parse'
import { buildSystemPrompt, buildUserMessage, getFollowupFormat, stripHtml } from './prompt'
import { decideFollowup } from './rules'
import type { FollowupEvaluationInput, GeneratedFollowup } from './types'

export const AI_FOLLOWUP_MODEL = 'mercury-2'
// Mercury 2 reasons before answering and the reasoning counts against this
// budget; 200 was exhausted by reasoning alone on some inputs.
export const AI_FOLLOWUP_MAX_OUTPUT_TOKENS = 400

export interface FollowupPromptMessage {
  role: 'system' | 'user'
  content: string
}

export interface FollowupGenerationDeps {
  /**
   * Run the model. Resolve to the raw response text, or null when the call was
   * not made (quota exhausted). May throw on provider errors.
   */
  complete: (messages: FollowupPromptMessage[], maxOutputTokens: number) => Promise<string | null>
  onError?: (error: unknown) => void
}

/**
 * Decide whether to probe, and write the probe. Returns null for "no follow-up".
 * Never throws: participant-facing, so every failure means "move on", except
 * when the researcher's rules require a probe, in which case a template is used.
 */
export async function generateFollowup(
  input: FollowupEvaluationInput,
  deps: FollowupGenerationDeps
): Promise<GeneratedFollowup | null> {
  const decision = decideFollowup(input)
  if (decision.kind === 'skip') return null

  const format = getFollowupFormat(input)
  const previousQuestions = [stripHtml(input.question.text), ...input.thread.map((t) => t.question)]

  let content: string | null = null
  try {
    content = await deps.complete(
      [
        { role: 'system', content: buildSystemPrompt(format, decision.mustAsk) },
        { role: 'user', content: buildUserMessage(input, decision.signal) },
      ],
      AI_FOLLOWUP_MAX_OUTPUT_TOKENS
    )
  } catch (error) {
    deps.onError?.(error)
  }

  const parsed = content ? parseFollowupResponse(content, format, previousQuestions) : null
  if (parsed) {
    return {
      question: parsed.question,
      triggerReason: parsed.reason ?? decision.signal,
      followupType: parsed.followupType,
      followupConfig: parsed.followupConfig,
      modelUsed: AI_FOLLOWUP_MODEL,
    }
  }

  if (decision.mustAsk && decision.fallbackQuestion) {
    return {
      question: decision.fallbackQuestion,
      triggerReason: decision.signal,
      followupType: 'text',
      followupConfig: null,
      modelUsed: 'template',
    }
  }

  return null
}
