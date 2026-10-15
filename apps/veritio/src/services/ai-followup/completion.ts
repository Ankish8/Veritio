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

// The player gives up after 10s. Mercury normally answers in under a second,
// so a short primary timeout leaves room for one fallback attempt.
const PRIMARY_TIMEOUT_MS = 3500
const FALLBACK_TIMEOUT_MS = 5000

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
  return callFollowupModel(messages, maxOutputTokens, (status) =>
    logger.warn('AI followup falling back to OpenAI', { status, studyId: scope.studyId })
  )
}

/**
 * The model call itself, without quota: Mercury 2, then one OpenAI attempt on
 * a retryable failure. Exported for the offline eval (scripts/eval-ai-followup.ts)
 * so it measures exactly what production runs.
 */
export async function callFollowupModel(
  messages: FollowupPromptMessage[],
  maxOutputTokens: number,
  onFallback?: (status: number | undefined) => void
): Promise<FollowupCompletion> {
  try {
    const result = await createChatCompletion(messages, {
      maxTokens: maxOutputTokens,
      responseFormat: { type: 'json_object' },
      // 'medium' scored 30/30 on the eval vs 29/30 for 'low', for ~70ms more latency.
      reasoningEffort: 'medium',
      // Same answer, same decision: keeps probing consistent across participants.
      temperature: 0,
      timeoutMs: PRIMARY_TIMEOUT_MS,
    })
    return { content: textOf(result.content), model: 'mercury-2' }
  } catch (error) {
    if (!isRetryable(error) || !process.env.OPENAI_API_KEY) throw error
    onFallback?.(statusOf(error))
  }

  // GPT-5 models only accept the default temperature, so none is sent here.
  const result = await createChatCompletion(messages, {
    provider: 'openai',
    maxTokens: maxOutputTokens,
    responseFormat: { type: 'json_object' },
    reasoningEffort: 'minimal',
    timeoutMs: FALLBACK_TIMEOUT_MS,
  })
  return { content: textOf(result.content), model: 'gpt-5-mini' }
}

function textOf(content: unknown): string {
  return typeof content === 'string' ? content : ''
}

function statusOf(error: unknown): number | undefined {
  const status = (error as { status?: unknown })?.status
  return typeof status === 'number' ? status : undefined
}

/**
 * Rate limits, server errors, timeouts and connection failures are worth a
 * second provider. A 400 (bad request or content filter) would fail there too.
 */
export function isRetryable(error: unknown): boolean {
  const status = statusOf(error)
  if (status === undefined) return true
  return status === 408 || status === 429 || status >= 500
}
