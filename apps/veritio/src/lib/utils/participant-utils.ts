/**
 * Participant Utilities
 *
 * Provides consistent participant numbering across all study analysis views.
 * This ensures "Participant 4" refers to the same person in Recordings, Participants, etc.
 */

/**
 * Creates a consistent participant number mapping based on started_at timestamp.
 *
 * @param participants - Array of participants with at minimum { id: string, started_at: string | null }
 * @returns Map of participant_id -> participant number (1-indexed)
 *
 * @example
 * ```ts
 * const numberMap = createParticipantNumberMap(participants)
 * const participantNum = numberMap.get(participantId) || 0
 * // Display as: `Participant ${participantNum}`
 * ```
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

/**
 * Gets the participant number for a given participant ID.
 *
 * @param participantId - The participant ID to look up
 * @param numberMap - The participant number map
 * @returns The participant number (1-indexed) or 0 if not found
 */
/**
 * Sort participants by started_at timestamp.
 * Defaults to descending (latest first).
 */
export function sortParticipantsByDate<T extends { started_at?: string | null }>(
  participants: T[],
  direction: 'asc' | 'desc' = 'desc'
): T[] {
  return [...participants].sort((a, b) => {
    const aTime = a.started_at ? new Date(a.started_at).getTime() : 0
    const bTime = b.started_at ? new Date(b.started_at).getTime() : 0
    return direction === 'desc' ? bTime - aTime : aTime - bTime
  })
}

export function getParticipantNumber(
  participantId: string,
  numberMap: Map<string, number>
): number {
  return numberMap.get(participantId) || 0
}
