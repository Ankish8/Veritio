import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { EventHandlerContext } from '../../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { routeTriggerEvent } from '../../../services/composio/trigger-router'

const triggerEventSchema = z.object({
  triggerId: z.string(),
  eventType: z.string(),
  userId: z.string().optional(),
  triggerConfig: z.record(z.unknown()).optional(),
  toolkit: z.string().optional(),
  triggerSlug: z.string().optional(),
  payload: z.record(z.unknown()),
})

export const config = {
  name: 'ProcessComposioTriggerEvent',
  description: 'Process and route incoming Composio trigger events',
  triggers: [{
    type: 'queue',
    topic: 'composio-trigger-event',
  }],
  enqueues: ['notification', 'results-analysis-requested'],
  flows: ['integrations'],
} satisfies StepConfig

export const handler = async (
  input: z.infer<typeof triggerEventSchema>,
  { logger, enqueue }: EventHandlerContext
) => {
  try {
    const data = triggerEventSchema.parse(input)

    logger.info('Processing Composio trigger event', {
      triggerId: data.triggerId,
      eventType: data.eventType,
      toolkit: data.toolkit,
    })

    if (data.userId && data.toolkit && data.triggerSlug) {
      const supabase = getMotiaSupabaseClient()
      const { data: routeResult, error: routeError } = await routeTriggerEvent(
        supabase,
        {
          triggerId: data.triggerId,
          userId: data.userId,
          toolkit: data.toolkit,
          triggerSlug: data.triggerSlug,
          triggerConfig: data.triggerConfig ?? {},
        },
        data.payload,
        enqueue,
        logger
      )

      if (routeError) {
        logger.error('Failed to route trigger event', { error: routeError.message })
      } else {
        logger.info('Trigger event routed successfully', {
          triggerId: data.triggerId,
          actionsExecuted: routeResult?.actionsExecuted,
        })
      }
    } else {
      logger.warn('Trigger event missing enriched data, skipping routing', {
        triggerId: data.triggerId,
        hasUserId: !!data.userId,
        hasToolkit: !!data.toolkit,
      })
    }
  } catch (error) {
    logger.error('Failed to process Composio trigger event', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
  }
}
