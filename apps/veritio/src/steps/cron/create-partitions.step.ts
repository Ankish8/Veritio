import type { StepConfig } from 'motia'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'

export const config = {
  name: 'CreateMonthlyPartitions',
  description: 'Create future monthly partitions for recordings',
  triggers: [{ type: 'cron', expression: '0 0 0 1 * * *' }],
  enqueues: [],
  flows: ['maintenance'],
} satisfies StepConfig

export const handler = async (_input: unknown, { logger }: EventHandlerContext) => {
  const supabase = getMotiaSupabaseClient()

  const { error } = await supabase.rpc('create_monthly_partitions' as any, {
    table_name: 'recordings',
    months_ahead: 3,
  })

  if (error) {
    logger.error('Failed to create future partitions', { error })
    return
  }

  logger.info('Created future partitions for recordings')
}
