import type { StepConfig } from 'motia'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'
import { createOrganization, generateSlug } from '../../services/organization-service'
import { createProject } from '../../services/project-service'

const inputSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  email: z.string(),
})

export const config = {
  name: 'InitializeUserWorkspace',
  description: 'Create personal organization and default project for new user',
  triggers: [{
    type: 'queue',
    topic: 'user-workspace-init',
    input: inputSchema as any,
  }],
  enqueues: ['user-workspace-ready', 'notification'],
  flows: ['user-onboarding'],
} satisfies StepConfig

export const handler = async (
  input: z.infer<typeof inputSchema>,
  { logger, enqueue }: EventHandlerContext
) => {
  const data = inputSchema.parse(input)
  const supabase = getMotiaSupabaseClient()

  logger.info(`Initializing workspace for user: ${data.userId}`)

  const orgName = `${data.userName}'s Workspace`
  const baseSlug = generateSlug(data.userName.toLowerCase())

  const uniqueSuffix = Math.random().toString(36).substring(2, 8)
  const slug = `${baseSlug}-${uniqueSuffix}`

  const { data: organization, error: orgError } = await createOrganization(supabase, data.userId, {
    name: orgName,
    slug,
    settings: { type: 'personal' },
  })

  if (orgError) {
    logger.error('Failed to create personal organization', {
      userId: data.userId,
      error: orgError.message,
    })

    enqueue({
      topic: 'notification',
      data: {
        userId: data.userId,
        type: 'workspace-setup-failed',
        title: 'Workspace Setup Issue',
        message: 'We had trouble setting up your workspace. Please try refreshing the page.',
      },
    }).catch(() => {})
    return
  }

  logger.info('Personal organization created', {
    userId: data.userId,
    organizationId: organization!.id,
  })

  const { data: project, error: projectError } = await createProject(supabase, data.userId, {
    name: 'My First Project',
    description: 'Your first research project. Create studies to start collecting insights!',
    organizationId: organization!.id,
    visibility: 'private',
  })

  if (projectError) {
    logger.error('Failed to create default project', {
      userId: data.userId,
      organizationId: organization!.id,
      error: projectError.message,
    })
  } else {
    logger.info('Default project created', {
      userId: data.userId,
      projectId: project!.id,
    })
  }

  enqueue({
    topic: 'user-workspace-ready',
    data: {
      userId: data.userId,
      organizationId: organization!.id,
      projectId: project?.id || null,
    },
  }).catch(() => {})

  enqueue({
    topic: 'notification',
    data: {
      userId: data.userId,
      type: 'workspace-ready',
      title: 'Welcome to Veritio!',
      message: 'Your workspace is ready. Start by creating your first study!',
    },
  }).catch(() => {})

  logger.info(`Workspace initialization complete for user: ${data.userId}`)
}
