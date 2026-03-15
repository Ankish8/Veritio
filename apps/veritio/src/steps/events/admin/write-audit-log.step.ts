import type { StepConfig } from 'motia'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../../lib/motia/types'
import { writeAuditLog } from '../../../services/audit-log-service'

const inputSchema = z.object({
  userId: z.string(),
  action: z.string(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
})

export const config = {
  name: 'WriteAuditLog',
  description: 'Write an entry to the audit log',
  triggers: [{
    type: 'queue',
    topic: 'admin-audit-log',
    input: inputSchema as any,
  }],
  enqueues: [],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (input: z.infer<typeof inputSchema>, { logger }: EventHandlerContext) => {
  const data = inputSchema.parse(input)

  logger.info('Writing audit log entry', { action: data.action, userId: data.userId })

  const supabase = getMotiaSupabaseClient()
  await writeAuditLog(supabase, data, logger)
}
