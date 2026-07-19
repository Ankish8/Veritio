import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { redeemInviteCode } from '../../../services/invite-code-service'
import { getPostHogClient } from '../../../lib/posthog'

const bodySchema = z.object({
  code: z.string().min(1).max(20),
  email: z.string().optional().default(''),
  signupMethod: z.enum(['email', 'google']),
})

export const config = {
  name: 'RedeemInviteCode',
  description: 'Redeem an invite code after successful sign-up',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/invite-codes/redeem',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['auth'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const body = bodySchema.parse(req.body)
  const userId = req.headers['x-user-id'] as string

  const supabase = getMotiaSupabaseClient()

  // Resolve email from user record if not provided (Google OAuth flow)
  let email = body.email
  if (!email) {
    const { data: user } = await supabase
      .from('user')
      .select('email')
      .eq('id', userId)
      .single()
    email = user?.email || ''
  }

  const result = await redeemInviteCode(
    supabase,
    body.code,
    userId,
    email,
    body.signupMethod,
    logger
  )

  if (!result.success) {
    return {
      status: 400,
      body: { error: result.error },
    }
  }

  const posthog = getPostHogClient()
  posthog?.identify({
    distinctId: userId,
    properties: {
      email,
      signup_method: body.signupMethod,
    },
  })
  posthog?.capture({
    distinctId: userId,
    event: 'user signed up',
    properties: {
      signup_method: body.signupMethod,
      invite_code: body.code,
    },
  })

  return {
    status: 200,
    body: { success: true },
  }
}
