import type { ParticipantDisplaySettings } from '../supabase/study-flow-types'
import { resolveParticipantDisplay, extractDemographicsFromMetadata } from './participant-display'

interface ParticipantWithMetadata {
  id: string
  metadata: unknown
}

export function buildParticipantDisplayMap(
  participants: ParticipantWithMetadata[],
  displaySettings: ParticipantDisplaySettings | null | undefined
): Map<string, { primary: string; secondary: string | null }> {
  const map = new Map<string, { primary: string; secondary: string | null }>()
  participants.forEach((p, index) => {
    const demographics = extractDemographicsFromMetadata(p.metadata)
    const display = resolveParticipantDisplay(displaySettings, {
      index: index + 1,
      demographics,
    })
    map.set(p.id, display)
  })
  return map
}
