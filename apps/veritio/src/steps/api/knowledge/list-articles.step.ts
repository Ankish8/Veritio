import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listKnowledgeArticles } from '../../../services/knowledge-service'

const articleSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  preview: z.string(),
  content: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  contexts: z.array(z.string()),
  priority: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
})

const responseSchema = z.array(articleSchema)

export const config = {
  name: 'ListKnowledgeArticles',
  description: 'List all knowledge base articles',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/knowledge/articles',
    middleware: [errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['knowledge'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  logger.info('Listing knowledge articles')

  const supabase = getMotiaSupabaseClient()
  const { data: articles, error } = await listKnowledgeArticles(supabase)

  if (error) {
    logger.error('Failed to list knowledge articles', { error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to fetch knowledge articles' },
    }
  }

  logger.info('Knowledge articles listed successfully', { count: articles?.length || 0 })

  return {
    status: 200,
    body: articles || [],
  }
}
