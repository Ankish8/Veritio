import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { EventHandlerContext } from '../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'

const inputSchema = z.object({
  resourceType: z.enum(['study', 'project']),
  action: z.enum(['create', 'delete']),
  userId: z.string(),
  resourceId: z.string().optional(),
  studyId: z.string().optional(),
  projectId: z.string().optional(),
})

export const config = {
  name: 'RefreshDashboardStatsOnChange',
  description: 'Refresh materialized views when studies or projects are created/deleted',
  triggers: [
    { type: 'queue', topic: 'study-deleted', input: inputSchema as any },
    { type: 'queue', topic: 'project-deleted', input: inputSchema as any },
    { type: 'queue', topic: 'study-created', input: inputSchema as any },
    { type: 'queue', topic: 'project-created', input: inputSchema as any },
  ],
  enqueues: [],
  flows: ['dashboard'],
} satisfies StepConfig

export const handler = async (
  input: z.infer<typeof inputSchema>,
  { logger }: EventHandlerContext
) => {
  const data = inputSchema.parse(input)

  logger.info('Refreshing dashboard stats after change', {
    resourceType: data.resourceType,
    action: data.action,
    resourceId: data.resourceId || data.studyId || data.projectId,
  })

  const supabase = getMotiaSupabaseClient()

  try {
    const startTime = Date.now()

    const { error } = await supabase.rpc('refresh_dashboard_materialized_views' as any)

    if (error) {
      logger.error('Failed to refresh dashboard materialized views', {
        error: error.message,
        resourceType: data.resourceType,
        action: data.action,
      })
      return
    }

    const duration = Date.now() - startTime

    logger.info('Dashboard stats refreshed successfully', {
      resourceType: data.resourceType,
      action: data.action,
      duration_ms: duration,
    })
  } catch (error) {
    logger.error('Failed to refresh dashboard stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
      resourceType: data.resourceType,
      action: data.action,
      stack: error instanceof Error ? error.stack : undefined,
    })
  }
}
