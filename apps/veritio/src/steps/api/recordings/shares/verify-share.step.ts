import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { getShareByCode, verifySharePassword, recordShareView } from '../../../../services/recording/index'

const bodySchema = z.object({
  password: z.string().optional(),
})

const responseSchema = z.object({
  valid: z.boolean(),
  recording_id: z.string().uuid().optional(),
  access_level: z.enum(['view', 'comment']).optional(),
  requires_password: z.boolean().optional(),
})

export const config = {
  name: 'VerifyRecordingShare',
  description: 'Verify a share link and optionally validate password (public endpoint)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/share/recording/:shareCode/verify',
    middleware: [errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: responseSchema as any,
    400: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const { shareCode } = req.pathParams
  const body = bodySchema.parse(req.body || {})

  const supabase = getMotiaSupabaseClient()

  const { data: share, error: shareError } = await getShareByCode(supabase, shareCode)

  if (shareError || !share) {
    logger.warn('Share not found', { shareCode })
    return {
      status: 404,
      body: { error: 'Share link not found or expired' },
    }
  }

  if (share.password_hash && !body.password) {
    return {
      status: 200,
      body: {
        valid: false,
        requires_password: true,
      },
    }
  }

  if (share.password_hash) {
    const { valid, error: _error } = await verifySharePassword(supabase, shareCode, body.password!)
    if (!valid) {
      return {
        status: 200,
        body: {
          valid: false,
          requires_password: true,
        },
      }
    }
  }

  await recordShareView(supabase, shareCode)

  return {
    status: 200,
    body: {
      valid: true,
      recording_id: share.recording_id,
      access_level: share.access_level,
      requires_password: false,
    },
  }
}
