import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { generatePublicResultsToken } from '../../../services/public-results-service'

export const config = {
  name: 'GeneratePublicResultsToken',
  description: 'Generate a public results sharing token for a study',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/public-results/token',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: z.object({
      token: z.string(),
      url: z.string(),
    }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['study-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId } = req.pathParams

  const supabase = getMotiaSupabaseClient()
  const result = await generatePublicResultsToken(supabase, studyId, userId)

  if (result.error) {
    const status = result.error === 'Study not found' ? 404 : result.error === 'Access denied' ? 403 : 500
    logger.warn('Failed to generate public results token', { error: result.error, studyId, userId })
    return {
      status,
      body: { error: result.error },
    }
  }

  const host = req.headers['host'] || 'localhost:4001'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const url = `${protocol}://${host}/results/public/${result.token}`

  return {
    status: 200,
    body: {
      token: result.token!,
      url,
    },
  }
}
