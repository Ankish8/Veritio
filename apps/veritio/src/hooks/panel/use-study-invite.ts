import { useState, useCallback } from 'react'
import { useAuthFetch } from '../use-auth-fetch'

export interface InviteResult {
  invited: number
  skipped: number
  message: string
}

interface UseStudyInviteReturn {
  inviteParticipants: (
    participantIds: string[],
    source?: 'widget' | 'link' | 'email' | 'direct'
  ) => Promise<InviteResult>
  isInviting: boolean
}

/** Hook for inviting panel participants to a study. */
export function useStudyInvite(studyId: string): UseStudyInviteReturn {
  const authFetch = useAuthFetch()
  const [isInviting, setIsInviting] = useState(false)

  const inviteParticipants = useCallback(
    async (
      participantIds: string[],
      source: 'widget' | 'link' | 'email' | 'direct' = 'direct'
    ): Promise<InviteResult> => {
      if (participantIds.length === 0) {
        throw new Error('No participants selected')
      }

      if (participantIds.length > 1000) {
        throw new Error('Cannot invite more than 1000 participants at once')
      }

      setIsInviting(true)

      try {
        const response = await authFetch(`/api/studies/${studyId}/invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participant_ids: participantIds,
            source,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to invite participants')
        }

        return await response.json()
      } finally {
        setIsInviting(false)
      }
    },
    [authFetch, studyId]
  )

  return {
    inviteParticipants,
    isInviting,
  }
}
