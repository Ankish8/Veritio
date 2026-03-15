import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { EventHandlerContext } from '../../lib/motia/types'

const inputSchema = z.object({
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().optional(),
  studyId: z.string().optional(),
  projectId: z.string().optional(),
  stats: z.any().optional(),
  timestamp: z.string().optional(),
  metadata: z.any().optional(),
})

export const config = {
  name: 'CompleteActivityLogging',
  description: 'Terminal handler that completes observability chains - receives activity logs and audit events',
  triggers: [
    { type: 'queue', topic: 'recording-finalized', input: inputSchema as any },
    { type: 'queue', topic: 'recordings-deleted', input: inputSchema as any },
    { type: 'queue', topic: 'results-analytics-ready', input: inputSchema as any },
  ],
  enqueues: [],
  flows: ['observability'],
} satisfies StepConfig

export const handler = async (input: z.infer<typeof inputSchema>, { logger }: EventHandlerContext) => {
  const data = inputSchema.parse(input)

  logger.info('[OBSERVABILITY] Activity logged', {
    resourceType: data.resourceType,
    action: data.action,
    userId: data.userId,
    studyId: data.studyId,
    projectId: data.projectId,
    stats: data.stats,
  })
}
