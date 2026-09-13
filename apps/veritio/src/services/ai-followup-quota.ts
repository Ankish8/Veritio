import { consumeDistributedRateLimits } from '../middlewares/rate-limit'

const CHARACTERS_PER_ESTIMATED_TOKEN = 4
const TOKENS_PER_COST_POINT = 100

interface AiFollowupQuotaContext {
  organizationId: string
  studyId: string
  participantId: string
}

interface PromptMessage {
  content: string
}

export function estimateAiFollowupCostPoints(messages: PromptMessage[], maxOutputTokens: number): number {
  const inputCharacters = messages.reduce((total, message) => total + message.content.length, 0)
  const estimatedInputTokens = Math.ceil(inputCharacters / CHARACTERS_PER_ESTIMATED_TOKEN)
  return Math.max(1, Math.ceil((estimatedInputTokens + maxOutputTokens) / TOKENS_PER_COST_POINT))
}

export async function consumeAiFollowupQuota(
  context: AiFollowupQuotaContext,
  messages: PromptMessage[],
  maxOutputTokens: number
): Promise<boolean> {
  const points = estimateAiFollowupCostPoints(messages, maxOutputTokens)
  const decision = await consumeDistributedRateLimits([
    {
      tier: 'ai-followup-participant',
      identifier: `ai-followup:participant:${context.participantId}`,
      points,
    },
    {
      tier: 'ai-followup-study',
      identifier: `ai-followup:study:${context.studyId}`,
      points,
    },
    {
      tier: 'ai-followup-organization',
      identifier: `ai-followup:organization:${context.organizationId}`,
      points,
    },
  ])

  return decision.allowed
}
