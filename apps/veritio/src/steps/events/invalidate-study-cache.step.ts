import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { EventHandlerContext } from '../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import { cache, cacheKeys } from '../../lib/cache/memory-cache'

export const config = {
  name: 'InvalidateStudyCache',
  description: 'Drop cached study config and participant payloads when a study changes state',
  triggers: [
    { type: 'queue', topic: 'study-updated' },
    { type: 'queue', topic: 'study-closed' },
    { type: 'queue', topic: 'study-archived' },
    { type: 'queue', topic: 'study-deleted' },
  ],
  enqueues: [],
  flows: ['study-content'],
} satisfies StepConfig

const inputSchema = z.object({ studyId: z.string() }).passthrough()

export const handler = async (
  input: z.infer<typeof inputSchema>,
  { logger }: EventHandlerContext
) => {
  const { studyId } = inputSchema.parse(input)

  try {
    // Study-scoped config caches (deletes propagate to all instances)
    cache.delete(cacheKeys.study(studyId))
    cache.delete(cacheKeys.cards(studyId))
    cache.delete(cacheKeys.categories(studyId))
    cache.delete(cacheKeys.treeNodes(studyId))
    cache.delete(cacheKeys.tasks(studyId))
    cache.deletePattern(cacheKeys.flowQuestions(studyId))
    cache.delete(cacheKeys.prototype(studyId))
    cache.delete(cacheKeys.prototypeFrames(studyId))
    cache.delete(cacheKeys.prototypeTasks(studyId))
    cache.delete(cacheKeys.firstImpressionDesigns(studyId))

    // Participant payload is keyed by share code / url slug; resolve them.
    // For study-deleted the row is gone — the payload entry self-expires
    // within its 30s TTL and participant creation 404s in the meantime.
    const supabase = getMotiaSupabaseClient()
    const { data: study } = await supabase
      .from('studies')
      .select('share_code, url_slug')
      .eq('id', studyId)
      .maybeSingle()

    if (study?.share_code) {
      cache.delete(cacheKeys.participateStudy(study.share_code))
    }
    if (study?.url_slug) {
      cache.delete(cacheKeys.participateStudy(study.url_slug))
    }

    logger.info('Study cache invalidated', { studyId })
  } catch (error) {
    // Fail-open: TTLs bound staleness even if invalidation fails
    logger.error('Failed to invalidate study cache', {
      error: error instanceof Error ? error.message : 'Unknown error',
      studyId,
    })
  }
}
