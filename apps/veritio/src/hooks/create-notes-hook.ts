'use client'

import { useCallback } from 'react'
import useSWR from 'swr'
import { useSession } from '@veritio/auth/client'
import { getAuthFetchInstance } from '@/lib/swr'

interface BaseNote {
  id: string
  content: string
  author_name: string
  user_id: string | null
  created_at: string
  updated_at: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface CreateNotesHookConfig<TNote extends BaseNote, TParams extends unknown[]> {
  getSwrKey: (...params: TParams) => string
  getDeleteEndpoint: (noteId: string) => string
}

interface NotesHookResult<TNote extends BaseNote> {
  notes: TNote[]
  isLoading: boolean
  error: string | null
  refetch: () => void
  addNote: (content: string) => Promise<TNote>
  deleteNote: (noteId: string) => Promise<boolean>
  currentUserId: string | undefined
}

/** Factory function to create notes hooks with shared CRUD logic and optimistic updates. */
export function createNotesHook<TNote extends BaseNote, TParams extends unknown[]>(
  config: CreateNotesHookConfig<TNote, TParams>
): (...params: TParams) => NotesHookResult<TNote> {
  return function useNotes(...params: TParams): NotesHookResult<TNote> {
    const { data: session } = useSession()
    const user = session?.user

    const swrKey = config.getSwrKey(...params)

    const { data: notes, error, isLoading, mutate } = useSWR<TNote[]>(
      swrKey,
      null, // Uses global fetcher
    )

    // Auth fetch for mutations only
    const authFetch = getAuthFetchInstance()

    const addNote = useCallback(async (content: string) => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const authorName = user.name || user.email || 'Unknown User'

      const response = await authFetch(swrKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, authorName }),
      })

      if (!response.ok) {
        throw new Error('Failed to create note')
      }

      const newNote = await response.json()

      // Optimistically update the cache
      mutate((currentNotes) => {
        if (!currentNotes) return [newNote]
        return [newNote, ...currentNotes]
      }, { revalidate: false })

      return newNote as TNote
    }, [authFetch, swrKey, mutate, user])

    const deleteNote = useCallback(async (noteId: string) => {
      // Optimistically remove from cache
      mutate((currentNotes) => {
        if (!currentNotes) return []
        return currentNotes.filter(note => note.id !== noteId)
      }, { revalidate: false })

      const response = await authFetch(config.getDeleteEndpoint(noteId), {
        method: 'DELETE',
      })

      if (!response.ok) {
        // Revert on error
        mutate()
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete note')
      }

      return true
    }, [authFetch, mutate])

    return {
      notes: notes || [],
      isLoading,
      error: error?.message || null,
      refetch: () => mutate(),
      addNote,
      deleteNote,
      currentUserId: user?.id,
    }
  }
}
