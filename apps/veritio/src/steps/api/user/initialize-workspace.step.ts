import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listUserOrganizations } from '../../../services/organization-service'

const responseSchema = z.object({
  initialized: z.boolean(),
  message: z.string(),
})

export const config = {
  name: 'InitializeUserWorkspace',
  description: 'Initialize personal organization and default project for new user',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/user/initialize-workspace',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
     
    200: responseSchema as any,
     
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['user-workspace-init'],
  flows: ['user-onboarding'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string

  logger.info('Initialize workspace request', { userId })

  const supabase = getMotiaSupabaseClient()

  const { data: existingOrgs, error } = await listUserOrganizations(supabase, userId)

  if (error) {
    logger.error('Failed to check existing organizations', { userId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to check workspace status' },
    }
  }

  if (existingOrgs && existingOrgs.length > 0) {
    logger.info('User already has organizations, skipping initialization', {
      userId,
      orgCount: existingOrgs.length,
    })
    return {
      status: 200,
      body: { initialized: false, message: 'Workspace already exists' },
    }
  }

  const { data: user } = await supabase
    .from('user')
    .select('name, email')
    .eq('id', userId)
    .single()

  const userName = user?.name || user?.email?.split('@')[0] || 'User'

  // Intended trial plan from the marketing link (?plan=), carried via the __signup_plan cookie.
  const cookieHeader = (req.headers['cookie'] as string) || ''
  const planMatch = cookieHeader.match(/(?:^|;\s*)__signup_plan=(starter|pro|team)\b/)
  const plan = planMatch?.[1] as 'starter' | 'pro' | 'team' | undefined

  enqueue({
    topic: 'user-workspace-init',
    data: {
      userId,
      userName,
      email: user?.email || '',
      plan,
    },
  }).catch(() => {})

  logger.info('Workspace initialization triggered', { userId, userName })

  return {
    status: 200,
    body: { initialized: true, message: 'Workspace initialization started' },
  }
}
