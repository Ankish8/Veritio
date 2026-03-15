import type { StepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createTrigger } from '../../../../services/composio/triggers'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { getUserId, Errors, Success } from './shared'

const bodySchema = z.object({
  toolkit: z.string().min(1),
  triggerSlug: z.string().min(1),
  config: z.record(z.unknown()).default({}),
})

export const config = {
  name: 'ComposioCreateTrigger',
  description: 'Create a new Composio event trigger',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/integrations/composio/triggers',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: ['composio-trigger-created'],
  flows: ['auth'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = getUserId(req)
  const parsed = bodySchema.safeParse(req.body)

  if (!parsed.success) {
    return Errors.invalidBody(parsed.error.issues)
  }

  const { toolkit, triggerSlug, config: triggerConfig } = parsed.data

  // Validate: if actions includes 'analysis', studyId + studyType must be present
  const actions = triggerConfig?.actions as string[] | undefined
  if (Array.isArray(actions) && actions.includes('analysis')) {
    if (!triggerConfig?.studyId || !triggerConfig?.studyType) {
      return Errors.invalidBody('analysis action requires studyId and studyType in config')
    }
  }

  logger.info('Creating trigger', { userId, toolkit, triggerSlug })

  const supabase = getMotiaSupabaseClient()
  const configArg = Object.keys(triggerConfig).length > 0 ? triggerConfig : undefined
  const { data, error } = await createTrigger(supabase, userId, toolkit, triggerSlug, configArg)

  if (error) {
    logger.error('Failed to create trigger', { userId, toolkit, triggerSlug, error: error.message })
    return Errors.serverError('Failed to create trigger')
  }

  logger.info('Trigger created', { userId, toolkit, triggerSlug, triggerId: data?.id })
  await enqueue({ topic: 'composio-trigger-created', data: { userId, toolkit, triggerSlug, triggerId: data?.id } }).catch(() => {})

  return Success.created(data)
}
