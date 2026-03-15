import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getKnowledgeArticleBySlug } from '../../../services/knowledge-service'

const paramsSchema = z.object({
  slug: z.string().min(1),
})

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

export const config = {
  name: 'GetKnowledgeArticle',
  description: 'Get a single knowledge base article by slug',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/knowledge/articles/:slug',
    middleware: [errorHandlerMiddleware],
    responseSchema: {
    200: articleSchema as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['knowledge'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const params = paramsSchema.parse(req.pathParams)

  logger.info('Getting knowledge article', { slug: params.slug })

  const supabase = getMotiaSupabaseClient()
  const { data: article, error } = await getKnowledgeArticleBySlug(supabase, params.slug)

  if (error) {
    if (error.message === 'Article not found') {
      logger.warn('Knowledge article not found', { slug: params.slug })
      return {
        status: 404,
        body: { error: 'Article not found' },
      }
    }
    logger.error('Failed to get knowledge article', { slug: params.slug, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to fetch knowledge article' },
    }
  }

  logger.info('Knowledge article retrieved successfully', { slug: params.slug })

  return {
    status: 200,
    body: article,
  }
}
