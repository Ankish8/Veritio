import type { LiveWebsiteEvent } from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'

export interface ClickStats {
  totalClicks: number
  uniqueParticipants: number
  hits: number
  misses: number
  hitRate: number
  hasHitMissData: boolean
}

/**
 * Compute click statistics from live website events.
 * Uses `metadata.wasInteractive` to determine hit/miss.
 * Events without this field are excluded from hit/miss counts.
 */
export function computeClickStats(clickEvents: LiveWebsiteEvent[]): ClickStats {
  const totalClicks = clickEvents.length
  const uniqueParticipants = new Set(
    clickEvents.map(e => e.participant_id).filter(Boolean)
  ).size

  let hits = 0
  let misses = 0
  let hasHitMissData = false

  for (const event of clickEvents) {
    const wasInteractive = event.metadata?.wasInteractive
    if (wasInteractive === true) {
      hits++
      hasHitMissData = true
    } else if (wasInteractive === false) {
      misses++
      hasHitMissData = true
    }
    // undefined = old event without wasInteractive, skip hit/miss counting
  }

  const hitMissTotal = hits + misses
  const hitRate = hitMissTotal > 0 ? Math.round((hits / hitMissTotal) * 100) : 0

  return { totalClicks, uniqueParticipants, hits, misses, hitRate, hasHitMissData }
}
