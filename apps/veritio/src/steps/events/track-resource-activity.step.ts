import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { EventHandlerContext } from '../../lib/motia/types'

const inputSchema = z.object({
  resourceType: z.string(),
  resourceId: z.string().optional(),
  action: z.string(),
  userId: z.string().optional(),
  studyId: z.string().optional(),
  projectId: z.string().optional(),
  metadata: z.any().optional(),
})

export const config = {
  name: 'TrackResourceActivity',
  description: 'Central handler for tracking resource CRUD operations for observability',
  triggers: [
    { type: 'queue', topic: 'project-created', input: inputSchema as any },
    { type: 'queue', topic: 'project-updated', input: inputSchema as any },
    { type: 'queue', topic: 'project-deleted', input: inputSchema as any },
    { type: 'queue', topic: 'project-archived', input: inputSchema as any },
    { type: 'queue', topic: 'project-restored', input: inputSchema as any },
    { type: 'queue', topic: 'study-created', input: inputSchema as any },
    { type: 'queue', topic: 'study-updated', input: inputSchema as any },
    { type: 'queue', topic: 'study-deleted', input: inputSchema as any },
    { type: 'queue', topic: 'study-archived', input: inputSchema as any },
    { type: 'queue', topic: 'study-restored', input: inputSchema as any },
  ],
  enqueues: [],
  flows: ['observability'],
} satisfies StepConfig

export const handler = async (input: z.infer<typeof inputSchema>, { logger, traceId }: EventHandlerContext) => {
  const data = inputSchema.parse(input)

  logger.info(`Resource activity: ${data.action} on ${data.resourceType}`, {
    resourceId: data.resourceId,
    userId: data.userId,
    studyId: data.studyId,
    projectId: data.projectId,
    traceId,
  })
}
