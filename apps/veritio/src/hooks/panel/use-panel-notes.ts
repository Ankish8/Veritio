import useSWR from 'swr'
import { useCallback } from 'react'
import { useAuthFetch } from '../use-auth-fetch'
import { useCurrentOrganizationId } from '@/stores/collaboration-store'
import type { PanelParticipantNote } from '@/lib/supabase/panel-types'

/** Manages notes for a specific participant. */
export function usePanelNotes(participantId: string | null) {
  const authFetch = useAuthFetch()
  const organizationId = useCurrentOrganizationId()

  const { data, error, isLoading, mutate } = useSWR<PanelParticipantNote[]>(
    participantId && organizationId ? `/api/panel/participants/${participantId}/notes?organizationId=${organizationId}` : null
  )

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const createNote = useCallback(async (content: string) => {
    if (!participantId) throw new Error('Participant ID is required')

    const response = await authFetch(`/api/panel/participants/${participantId}/notes?organizationId=${organizationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create note')
    }

    const newNote = await response.json()
    mutate((notes) => [newNote, ...(notes || [])], { revalidate: false })
    return newNote as PanelParticipantNote
  }, [participantId, authFetch, mutate]) // eslint-disable-line react-hooks/exhaustive-deps

  const deleteNote = useCallback(async (noteId: string) => {
    const response = await authFetch(`/api/panel/notes/${noteId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete note')
    }

    mutate((notes) => notes?.filter(n => n.id !== noteId), { revalidate: false })
  }, [authFetch, mutate])

  return {
    notes: data || [],
    isLoading,
    error,
    mutate,
    createNote,
    deleteNote,
  }
}
