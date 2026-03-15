import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { EventHandlerContext } from '../../lib/motia/types'
import { clearStudyMetricsCache } from '../../lib/cache/metrics-cache'
import { responseValidatedSchema } from '../../lib/events/schemas'

export const config = {
  name: 'InvalidateMetricsCache',
  description: 'Clear cached metrics when responses are validated',
  triggers: [{
    type: 'queue',
    topic: 'response-validated',
  }],
  enqueues: [],
  flows: ['participation'],
} satisfies StepConfig

export const handler = async (
  input: z.infer<typeof responseValidatedSchema>,
  { logger }: EventHandlerContext
) => {
  const data = responseValidatedSchema.parse(input)

  try {
    clearStudyMetricsCache(data.studyId)

    logger.info('Metrics cache invalidated', {
      studyId: data.studyId,
      participantId: data.participantId,
      studyType: data.studyType,
    })
  } catch (error) {
    // Fail-open: TTL will eventually clear stale data
    logger.error('Failed to invalidate metrics cache', {
      error: error instanceof Error ? error.message : 'Unknown error',
      studyId: data.studyId,
    })
  }
}
