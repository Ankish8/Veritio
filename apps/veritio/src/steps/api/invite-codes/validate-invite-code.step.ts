import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { validateInviteCode } from '../../../services/invite-code-service'

const bodySchema = z.object({
  code: z.string().min(1).max(20),
})

export const config = {
  name: 'ValidateInviteCode',
  description: 'Public endpoint to validate an invite code before sign-up',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/invite-codes/validate',
    middleware: [],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['auth'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const body = bodySchema.parse(req.body)

  const supabase = getMotiaSupabaseClient()
  const result = await validateInviteCode(supabase, body.code, logger)

  // Don't expose codeId to the client
  return {
    status: 200,
    body: { valid: result.valid, error: result.error },
  }
}
