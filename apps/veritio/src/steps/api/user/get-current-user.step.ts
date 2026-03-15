import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const responseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
})

export const config = {
  name: 'GetCurrentUser',
  description: 'Get the current authenticated user profile',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/user/me',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['user-settings'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string

  logger.info('Fetching current user', { userId })

  const supabase = getMotiaSupabaseClient()

  const { data: user, error } = await supabase
    .from('user')
    .select('id, email, name, image')
    .eq('id', userId)
    .single()

  if (error) {
    logger.error('Failed to fetch user', { userId, error: error.message })
    return {
      status: error.code === 'PGRST116' ? 404 : 500,
      body: { error: error.code === 'PGRST116' ? 'User not found' : 'Failed to fetch user' },
    }
  }

  logger.info('Current user fetched successfully', { userId })

  return {
    status: 200,
    body: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    },
  }
}
