import type { StepConfig } from 'motia'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'

const inputSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string(),
})

export const config = {
  name: 'SetupProjectAnalytics',
  description: 'Initialize analytics tracking for a new project',
  triggers: [{
    type: 'queue',
    topic: 'project-initialized',
    input: inputSchema as any,
  }],
  enqueues: ['project-analytics-ready'],
  flows: ['project-management', 'results-analysis'],
} satisfies StepConfig

export const handler = async (input: z.infer<typeof inputSchema>, { logger, enqueue, state }: EventHandlerContext) => {
  const data = inputSchema.parse(input)
  const supabase = getMotiaSupabaseClient()

  logger.info(`Setting up analytics for project: ${data.projectId}`)

  await state.set('project-analytics', data.projectId, {
    totalStudies: 0,
    totalParticipants: 0,
    activeStudies: 0,
    completedStudies: 0,
    lastActivityAt: new Date().toISOString(),
  })

  await (supabase as any)
    .from('activity_logs')
    .insert({
      entity_type: 'project',
      entity_id: data.projectId,
      action: 'created',
      user_id: data.userId,
      metadata: {
        analyticsInitialized: true,
        timestamp: new Date().toISOString(),
      },
    })
    .then(() => {})
    .catch(() => {})

  logger.info(`Analytics setup complete for project: ${data.projectId}`)

  enqueue({
    topic: 'project-analytics-ready',
    data: {
      projectId: data.projectId,
      userId: data.userId,
      timestamp: new Date().toISOString(),
    },
  }).catch(() => {})
}
