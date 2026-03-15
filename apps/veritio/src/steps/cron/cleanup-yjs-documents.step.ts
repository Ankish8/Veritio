import type { StepConfig } from 'motia'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'

export const config = {
  name: 'CleanupYjsDocuments',
  description: 'Compact and cleanup inactive Yjs collaboration documents',
  triggers: [{ type: 'cron', expression: '0 0 2 * * 0 *' }],
  enqueues: [],
  flows: ['maintenance', 'storage-optimization'],
} satisfies StepConfig

export const handler = async (_input: unknown, { logger }: EventHandlerContext) => {
  const supabase = getMotiaSupabaseClient()

  const { data, error } = await supabase.rpc('cleanup_orphaned_yjs_documents')

  if (error) {
    logger.error('Failed to cleanup Yjs documents', { error })
    return
  }

  logger.info('Deleted orphaned Yjs documents', { count: data ?? 0 })
}
