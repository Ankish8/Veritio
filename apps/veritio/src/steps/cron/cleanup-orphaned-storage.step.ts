import type { StepConfig } from 'motia'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'

export const config = {
  name: 'CleanupOrphanedStorage',
  description: 'Remove orphaned study-assets storage objects older than 30 days',
  triggers: [{ type: 'cron', expression: '0 0 3 * * 0 *' }],
  enqueues: [],
  flows: ['maintenance'],
} satisfies StepConfig

export const handler = async (_input: unknown, { logger }: EventHandlerContext) => {
  const supabase = getMotiaSupabaseClient()

  logger.info('Running orphaned storage cleanup job')

  const { data: orphaned, error: listError } = await supabase.rpc('get_orphaned_storage_objects' as any)

  if (listError) {
    logger.error('Failed to list orphaned storage objects', { error: listError })
    return
  }

  const orphanedCount = Array.isArray(orphaned) ? orphaned.length : 0
  if (orphanedCount === 0) {
    logger.info('No orphaned storage objects found')
    return
  }

  logger.info('Found orphaned storage objects, starting cleanup', { orphanedCount })

  const { data: deletedCount, error: cleanupError } = await supabase.rpc('cleanup_orphaned_storage' as any)

  if (cleanupError) {
    logger.error('Storage cleanup failed', { error: cleanupError })
    return
  }

  logger.info('Orphaned storage cleanup completed', {
    deletedCount: typeof deletedCount === 'number' ? deletedCount : 0,
  })
}
