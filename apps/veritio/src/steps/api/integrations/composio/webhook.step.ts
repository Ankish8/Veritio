import type { StepConfig } from 'motia'
import { errorHandlerMiddleware } from '../../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { handleWebhookEvent } from '../../../../services/composio/triggers'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { Errors, Success } from './shared'

export const config = {
  name: 'ComposioWebhook',
  description: 'Receive Composio webhook events',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/integrations/composio/webhook',
    middleware: [errorHandlerMiddleware],
  }],
  enqueues: ['composio-trigger-event'],
  flows: ['integrations'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const signature = req.headers['x-composio-signature'] as string | undefined
  const payload = req.body as Record<string, unknown>

  if (!payload || typeof payload !== 'object') {
    return Errors.invalidBody('Invalid webhook payload')
  }

  logger.info('Received webhook event', { type: payload.type, triggerId: payload.triggerId })

  const supabase = getMotiaSupabaseClient()
  const { data, error } = await handleWebhookEvent(supabase, payload, signature)

  if (error) {
    logger.error('Failed to process webhook', { error: error.message })
    return error.message === 'Invalid webhook signature'
      ? Errors.unauthorized('Invalid webhook signature')
      : Errors.serverError(error.message)
  }

  logger.info('Webhook processed', { triggerId: data?.triggerId, eventType: data?.eventType })

  enqueue({
    topic: 'composio-trigger-event',
    data: {
      triggerId: data?.triggerId,
      eventType: data?.eventType,
      userId: data?.userId,
      triggerConfig: data?.triggerConfig,
      toolkit: data?.toolkit,
      triggerSlug: data?.triggerSlug,
      payload,
    },
  }).catch(() => {})

  return Success.ok({ success: true })
}
