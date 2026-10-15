import { createChatCompletion } from '../assistant/openai'
import { consumeAiFollowupQuota } from '../ai-followup-quota'
import type { FollowupCompletion, FollowupPromptMessage } from './generate'

interface QuotaScope {
  organizationId: string
  studyId: string
  /** Participant id, or a preview key such as `preview:<userId>`. */
  participantId: string
}

interface QuotaLogger {
  warn: (message: string, meta?: Record<string, unknown>) => void
}

// The player gives up after 10s; Mercury normally answers in about a second.
const MODEL_TIMEOUT_MS = 8000

/**
 * Charge the AI follow-up cost quota, then call the model (see callFollowupModel).
 * Resolves to null (no call made) when any quota budget is spent.
 */
export async function createFollowupCompletion(
  scope: QuotaScope,
  messages: FollowupPromptMessage[],
  maxOutputTokens: number,
  logger: QuotaLogger
): Promise<FollowupCompletion | null> {
  const allowed = await consumeAiFollowupQuota(scope, messages, maxOutputTokens)
  if (!allowed) {
    logger.warn('AI followup cost quota exceeded', { ...scope })
    return null
  }
  return callFollowupModel(messages, maxOutputTokens)
}

/**
 * The model call itself, without quota. Follow-ups run on Mercury with the
 * platform key only: OpenAI is bring-your-own-key, and participants have no
 * key. If Mercury fails, the caller skips the probe (or uses its template).
 * Exported for the offline eval (scripts/eval-ai-followup.ts).
 */
export async function callFollowupModel(
  messages: FollowupPromptMessage[],
  maxOutputTokens: number
): Promise<FollowupCompletion> {
  const result = await createChatCompletion(messages, {
    maxTokens: maxOutputTokens,
    responseFormat: { type: 'json_object' },
    // 'medium' scored 30/30 on the eval vs 29/30 for 'low', for ~70ms more latency.
    reasoningEffort: 'medium',
    // Same answer, same decision: keeps probing consistent across participants.
    temperature: 0,
    timeoutMs: MODEL_TIMEOUT_MS,
  })
  return { content: typeof result.content === 'string' ? result.content : '', model: 'mercury-2' }
}
