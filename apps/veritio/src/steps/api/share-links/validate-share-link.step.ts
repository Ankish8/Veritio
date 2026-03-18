import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { validateShareLink, trackShareLinkView } from '../../../services/share-link-service'

const bodySchema = z.object({
  password: z.string().optional(),
})

const responseSchema = z.object({
  valid: z.boolean(),
  requires_password: z.boolean(),
  expired: z.boolean(),
  study_id: z.string().uuid().optional(),
  study_title: z.string().optional(),
  permissions: z.object({
    allow_download: z.boolean(),
    allow_comments: z.boolean(),
  }).optional(),
})

export const config = {
  name: 'ValidateShareLink',
  description: 'Validate a share link token and get study info (public)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/share/:token',
    middleware: [errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: responseSchema as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['share-link-accessed'],
  flows: ['collaboration'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const token = req.pathParams?.token as string

  if (!token) {
    return {
      status: 400,
      body: { error: 'Share token is required' },
    }
  }

  const validation = validateRequest(bodySchema, req.body || {}, logger)
  const password = validation.success ? validation.data.password : undefined

  logger.info('Validating share link', { token: token.slice(0, 8) + '...' })

  const supabase = getMotiaSupabaseClient()
  const { data: result, error } = await validateShareLink(supabase, token, password)

  if (error) {
    logger.error('Failed to validate share link', { error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to validate share link' },
    }
  }

  if (result?.valid) {
    await trackShareLinkView(supabase, token, {
      userAgent: req.headers['user-agent'] as string,
      referrer: req.headers['referer'] as string,
    })

    enqueue({
      topic: 'share-link-accessed',
      data: {
        shareToken: token,
        studyId: result.study_id,
      },
    }).catch(() => {})
  }

  return {
    status: 200,
    body: result!,
  }
}
