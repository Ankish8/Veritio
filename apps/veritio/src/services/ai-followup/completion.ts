import { createChatCompletion } from '../assistant/openai'
import { consumeAiFollowupQuota } from '../ai-followup-quota'
import type { FollowupPromptMessage } from './generate'

interface QuotaScope {
  organizationId: string
  studyId: string
  /** Participant id, or a preview key such as `preview:<userId>`. */
  participantId: string
}

interface QuotaLogger {
  warn: (message: string, meta?: Record<string, unknown>) => void
}

/**
 * Charge the AI follow-up cost quota, then call the model. Resolves to null
 * (no call made) when any participant, study or organization budget is spent.
 */
export async function createFollowupCompletion(
  scope: QuotaScope,
  messages: FollowupPromptMessage[],
  maxOutputTokens: number,
  logger: QuotaLogger
): Promise<string | null> {
  const allowed = await consumeAiFollowupQuota(scope, messages, maxOutputTokens)
  if (!allowed) {
    logger.warn('AI followup cost quota exceeded', { ...scope })
    return null
  }

  const result = await createChatCompletion(messages, {
    maxTokens: maxOutputTokens,
    responseFormat: { type: 'json_object' },
    reasoningEffort: 'low',
    // Same answer, same decision: keeps probing consistent across participants.
    temperature: 0,
    timeoutMs: 8000,
  })
  return typeof result.content === 'string' ? result.content : null
}
