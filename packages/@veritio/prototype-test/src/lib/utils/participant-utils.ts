/**
 * Participant Utilities
 *
 * Provides consistent participant numbering across all study analysis views.
 * This ensures "Participant 4" refers to the same person in Recordings, Participants, etc.
 */
export function createParticipantNumberMap<T extends { id: string; started_at: string | null }>(
  participants: T[]
): Map<string, number> {
  const map = new Map<string, number>()

  // Sort participants by started_at (earliest first) for consistent numbering
  // Participants without started_at go to the end
  const sorted = [...participants].sort((a, b) => {
    // Handle null started_at values - put them at the end
    if (!a.started_at && !b.started_at) return 0
    if (!a.started_at) return 1
    if (!b.started_at) return -1

    const dateA = new Date(a.started_at).getTime()
    const dateB = new Date(b.started_at).getTime()
    return dateA - dateB
  })

  // Assign sequential numbers starting from 1
  sorted.forEach((participant, index) => {
    map.set(participant.id, index + 1)
  })

  return map
}
export function getParticipantNumber(
  participantId: string,
  numberMap: Map<string, number>
): number {
  return numberMap.get(participantId) || 0
}
