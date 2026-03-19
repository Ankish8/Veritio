import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { createChatCompletion, streamChat } from '../../../services/assistant/openai'
import { errorResponse } from '../../../lib/response-helpers'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getUserAiOverrides } from '../../../services/user-ai-config-service'
import { getAdminAiConfigRaw } from '../../../services/admin-ai-config-service'

const actionEnum = z.enum([
  'improve',
  'simplify',
  'improve_clarity',
  'make_concise',
  'expand',
  'fix_grammar',
])

const bodySchema = z.object({
  text: z.string().min(1).max(10000),
  action: actionEnum,
  format: z.enum(['html', 'plain']),
  context: z.string().optional(),
  streamId: z.string().uuid().optional(),
})

export const config = {
  name: 'AssistantRefineText',
  description: 'Refine user text with AI (simplify, improve clarity, etc.)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/assistant/refine-text',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['assistant'],
} satisfies StepConfig

const ACTION_PROMPTS: Record<z.infer<typeof actionEnum>, string> = {
  improve: 'Improve this text. Expand it with more detail, improve clarity, and make it more professional while keeping the original intent.',
  simplify: 'Simplify this text. Use shorter sentences and simpler words while preserving the meaning.',
  improve_clarity: 'Improve the clarity of this text. Make it easier to understand without changing the intent.',
  make_concise: 'Make this text more concise. Remove unnecessary words and redundancies while keeping the core message.',
  expand: 'Expand this text with more detail and explanation while keeping it focused.',
  fix_grammar: 'Fix any grammar, spelling, and punctuation errors in this text. Keep the style and meaning unchanged.',
}

export const handler = async (req: ApiRequest, { logger, streams }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const body = bodySchema.parse(req.body)

  // Load per-user AI overrides and admin config
  const supabase = getMotiaSupabaseClient()
  const [userOverrides, adminConfigRaw] = await Promise.all([
    getUserAiOverrides(supabase, userId),
    getAdminAiConfigRaw(supabase),
  ])
  const adminConfig = adminConfigRaw ?? undefined

  if (body.streamId) {
    return handleStreaming(body, streams, logger, userOverrides ?? undefined, adminConfig)
  }

  try {
    const systemPrompt = buildSystemPrompt(body, 'json')
    const response = await createChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: body.text },
      ],
      { maxTokens: 500, timeoutMs: 15000, userOverrides: userOverrides ?? undefined, adminConfig },
    )

    if (!response.content) {
      return errorResponse.serverError('No response from AI')
    }

    return { status: 200, body: parseResponse(response.content) }
  } catch (err) {
    logger.error('Failed to refine text', { error: err })
    return errorResponse.serverError('Failed to refine text')
  }
}

async function handleStreaming(
  body: z.infer<typeof bodySchema>,
  streams: ApiHandlerContext['streams'],
  logger: ApiHandlerContext['logger'],
  userOverrides?: import('../../../services/user-ai-config-service').UserAiOverrides,
  adminConfig?: import('../../../services/admin-ai-config-service').AdminAiConfigRow,
) {
  const streamId = body.streamId!
  const systemPrompt = buildSystemPrompt(body, 'streaming')

  const pushEvent = (event: Record<string, unknown>) => {
    streams.assistantChat?.send({ groupId: streamId }, { type: 'event', data: event } as any).catch(() => {})
  }

  try {
    let fullContent = ''

    for await (const chunk of streamChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: body.text },
      ],
      undefined,
      { maxTokens: 500, userOverrides, adminConfig },
    )) {
      if (chunk.type === 'text_delta') {
        fullContent += chunk.content
        pushEvent({ type: 'refine_text_delta', content: chunk.content })
      } else if (chunk.type === 'text_replace') {
        fullContent = chunk.content
        pushEvent({ type: 'refine_text_replace', content: chunk.content })
      }

      if (chunk.type === 'done') {
        pushEvent({ type: 'refine_complete', refined: fullContent, rationale: '' })
      }
    }

    return { status: 200, body: { ok: true } }
  } catch (err) {
    logger.error('Failed to stream refine text', { error: err })
    await pushEvent({ type: 'error', message: 'Failed to refine text' })
    return errorResponse.serverError('Failed to refine text')
  }
}

function buildSystemPrompt(body: z.infer<typeof bodySchema>, outputMode: 'json' | 'streaming'): string {
  const actionInstruction = ACTION_PROMPTS[body.action]
  const formatInstruction =
    body.format === 'html'
      ? 'The input is HTML. Preserve all HTML formatting (bold, italic, lists, links, etc.) in your output.'
      : 'The input is plain text. Return plain text without any HTML or markdown formatting.'

  const contextNote = body.context
    ? `\nContext about this text: ${body.context}`
    : ''

  const outputInstruction = outputMode === 'json'
    ? `Return ONLY a JSON object with this exact format:
{"refined":"<the refined text>","rationale":"<1 sentence explaining what you changed>"}

Do not wrap the JSON in code fences. Do not include any text outside the JSON object.`
    : 'Return ONLY the refined text. Do not include any explanations, JSON wrapping, or commentary. Output the refined text directly.'

  return `You are a writing assistant for a UX research platform. ${actionInstruction}

${formatInstruction}${contextNote}

${outputInstruction}`
}

function parseResponse(content: string): { refined: string; rationale: string } {
  const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const parsed = JSON.parse(jsonStr)

  return {
    refined: typeof parsed.refined === 'string' ? parsed.refined : '',
    rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '',
  }
}
