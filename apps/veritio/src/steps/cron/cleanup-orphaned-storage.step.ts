import type { StepConfig } from '@/lib/motia/types'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'

export const config = {
  name: 'CleanupOrphanedStorage',
  description: 'Remove deleted-study assets after 30 days and unreferenced backgrounds after 7 days',
  triggers: [{ type: 'cron', expression: '0 0 3 * * SUN *' }],
  enqueues: [],
  flows: ['maintenance'],
} satisfies StepConfig

export const handler = async (_input: unknown, { logger }: EventHandlerContext) => {
  const supabase = getMotiaSupabaseClient()

  logger.info('Running orphaned storage cleanup job')

  const { data: orphaned, error: listError } = await supabase.rpc('get_orphaned_storage_objects' as any)

  if (listError) {
    logger.error('Failed to list orphaned storage objects', {
      error: listError,
    })
  } else {
    const orphanedCount = Array.isArray(orphaned) ? orphaned.length : 0
    if (orphanedCount === 0) {
      logger.info('No orphaned storage objects found')
    } else {
      logger.info('Found orphaned storage objects, starting cleanup', {
        orphanedCount,
      })

      const { data: deletedCount, error: cleanupError } = await supabase.rpc('cleanup_orphaned_storage' as any)

      if (cleanupError) {
        logger.error('Storage cleanup failed', { error: cleanupError })
      } else {
        logger.info('Orphaned storage cleanup completed', {
          deletedCount: typeof deletedCount === 'number' ? deletedCount : 0,
        })
      }
    }
  }

  const { data: deletedBackgroundCount, error: backgroundCleanupError } = await supabase.rpc(
    'cleanup_orphaned_background_storage' as any,
  )

  if (backgroundCleanupError) {
    logger.error('Background storage cleanup failed', {
      error: backgroundCleanupError,
    })
    return
  }

  logger.info('Background storage cleanup completed', {
    deletedCount: typeof deletedBackgroundCount === 'number' ? deletedBackgroundCount : 0,
  })
}
