import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listKnowledgeArticles, selectContextArticles } from '../../../services/knowledge-service'
import { streamChat } from '../../../services/assistant/openai'
import type { ChatCompletionMessageParam } from '../../../services/assistant/openai'
import type { SSEEvent } from '../../../services/assistant/types'

const bodySchema = z.object({
  question: z.string().min(1).max(2000),
  context: z.string().max(200).optional().default(''),
  streamId: z.string().uuid(),
})

export const config = {
  name: 'KnowledgeHelpQA',
  description: 'Answer a knowledge base question using article content as RAG context',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/knowledge/help',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['knowledge'],
} satisfies StepConfig

function buildKnowledgeSystemPrompt(
  articles: { title: string; slug: string; content: string }[],
  contextDescription: string,
): string {
  const articleSections = articles
    .map((a) => `### ${a.title}\n${a.content}`)
    .join('\n\n')

  return `You are a helpful guide for Veritio, a UX research platform. Answer questions using the reference articles below.

Rules:
- Be concise and direct. Use markdown formatting.
- Keep answers under 300 words unless detail is needed.
- If articles don't fully cover the question, say so and suggest exploring the related articles.
- Never make up features that aren't described in the articles.

${contextDescription ? `User is currently on: ${contextDescription}` : ''}

## Reference Articles
${articleSections}`
}

export const handler = async (req: ApiRequest, { logger, streams }: ApiHandlerContext) => {
  const { question, context, streamId } = bodySchema.parse(req.body)

  const pushEvent = (event: SSEEvent) => {
    streams.assistantChat?.send({ groupId: streamId }, { type: 'event', data: event } as any).catch(() => {})
  }

  // Fetch all articles
  const supabase = getMotiaSupabaseClient()
  const { data: articles, error: fetchError } = await listKnowledgeArticles(supabase)

  if (fetchError || !articles) {
    logger.error('Failed to fetch knowledge articles', { error: fetchError?.message })
    await pushEvent({ type: 'error', message: 'Failed to load knowledge base articles.' } as any)
    return { status: 500, body: { error: 'Failed to load articles' } }
  }

  // Select top relevant articles for RAG
  const selectedArticles = selectContextArticles(articles, context, 5)
  const usedArticleSlugs = selectedArticles.map((a) => a.slug)

  logger.info('Knowledge QA', {
    question: question.slice(0, 100),
    context,
    articlesUsed: usedArticleSlugs.length,
  })

  // Build messages
  const systemPrompt = buildKnowledgeSystemPrompt(
    selectedArticles.map((a) => ({ title: a.title, slug: a.slug, content: a.content })),
    context,
  )

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: question },
  ]

  // Collect events for JSON fallback
  const collectedEvents: SSEEvent[] = []

  try {
    for await (const chunk of streamChat(messages, undefined, { maxTokens: 1024 })) {
      if (chunk.type === 'text_delta' || chunk.type === 'text_replace') {
        const event: SSEEvent = { type: chunk.type, content: chunk.content } as any
        pushEvent(event)
        collectedEvents.push(event)
      }
      // Ignore tool_calls — knowledge QA doesn't use tools
    }

    // Send completion event with used article slugs
    const completeEvent: SSEEvent = {
      type: 'message_complete',
      messageId: crypto.randomUUID(),
      conversationId: streamId,
      metadata: { usedArticleSlugs },
    } as any
    pushEvent(completeEvent)
    collectedEvents.push(completeEvent)
  } catch (err) {
    logger.error('Knowledge QA streaming error', { error: String(err) })
    const errorEvent: SSEEvent = { type: 'error', message: 'Failed to generate answer.' } as any
    pushEvent(errorEvent)
    collectedEvents.push(errorEvent)
  }

  return {
    status: 200,
    body: { usedArticleSlugs, events: collectedEvents },
  }
}
