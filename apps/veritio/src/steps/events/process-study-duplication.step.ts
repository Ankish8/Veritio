import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'
import { duplicateStudyContent } from '../../services/study-duplication/duplicate-content'

const inputSchema = z.object({
  originalStudyId: z.string().uuid(),
  newStudyId: z.string().uuid(),
  userId: z.string(),
})

export const config = {
  name: 'ProcessStudyDuplication',
  description: 'Handle heavy lifting for study cloning (cards, categories, tree nodes, tasks, flow questions)',
  triggers: [
    {
      type: 'queue',
      topic: 'study-duplication-requested',
      input: inputSchema as any,
      infrastructure: {
        handler: { timeout: 60 },
        queue: { maxRetries: 3 },
      },
    },
  ],
  enqueues: ['notification'],
  flows: ['study-management'],
} satisfies StepConfig

/**
 * The async duplication path.
 *
 * The copying itself lives in `services/study-duplication/duplicate-content.ts`
 * so the public API and MCP can perform the same duplication synchronously —
 * they have no `enqueue`. What stays here is what only the engine can do:
 * retries and the completion notification.
 */
export const handler = async (input: z.infer<typeof inputSchema>, { logger, enqueue }: EventHandlerContext) => {
  const data = inputSchema.parse(input)
  const supabase = getMotiaSupabaseClient()

  logger.info(`Starting study duplication from ${data.originalStudyId} to ${data.newStudyId}`)

  try {
    await duplicateStudyContent(supabase, {
      originalStudyId: data.originalStudyId,
      newStudyId: data.newStudyId,
      logger,
    })

    enqueue({
      topic: 'notification',
      data: {
        userId: data.userId,
        type: 'study-duplication-complete',
        title: 'Study duplicated successfully',
        message: `Your study has been duplicated and is ready for editing.`,
        studyId: data.newStudyId,
      },
    }).catch(() => {})

    logger.info(`Study duplication completed successfully`)
  } catch (error) {
    logger.error('Study duplication failed', { error })

    enqueue({
      topic: 'notification',
      data: {
        userId: data.userId,
        type: 'study-duplication-failed',
        title: 'Study duplication failed',
        message: 'There was an error duplicating your study. Please try again.',
        originalStudyId: data.originalStudyId,
      },
    }).catch(() => {})
  }
}
