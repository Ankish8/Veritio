import type { StepConfig } from 'motia'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'

const inputSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string(),
  name: z.string(),
})

export const config = {
  name: 'InitializeProjectDefaults',
  description: 'Set up default project settings and send welcome notification',
  triggers: [{
    type: 'queue',
    topic: 'project-created',
    input: inputSchema as any,
  }],
  enqueues: ['project-initialized', 'notification'],
  flows: ['project-management'],
} satisfies StepConfig

export const handler = async (input: z.infer<typeof inputSchema>, { logger, enqueue }: EventHandlerContext) => {
  try {
    const data = inputSchema.parse(input)
    const supabase = getMotiaSupabaseClient()

    logger.info(`Initializing project defaults: ${data.projectId}`)

    await supabase
      .from('projects')
      .update({
        settings: {
          defaultStudySettings: {
            theme: 'default',
            language: 'en',
          },
          notifications: {
            emailOnStudyComplete: true,
            emailOnParticipantMilestone: true,
          },
        },
      } as any)
      .eq('id', data.projectId)

    enqueue({
      topic: 'project-initialized',
      data: {
        projectId: data.projectId,
        userId: data.userId,
      },
    }).catch(() => {})

    enqueue({
      topic: 'notification',
      data: {
        userId: data.userId,
        type: 'project-created',
        title: 'Project Created',
        message: `Your project "${data.name}" has been created successfully. Start by adding your first study!`,
        projectId: data.projectId,
      },
    }).catch(() => {})

    logger.info(`Project ${data.projectId} initialized with defaults`)
  } catch (error) {
    logger.error('InitializeProjectDefaults failed', { error, input })
    // Don't re-throw: prevents infinite BullMQ retry on non-transient errors
  }
}
