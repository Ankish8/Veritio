'use client'

import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { useSession } from '@veritio/auth/client'
import { useAuthFetch } from '@/hooks/use-auth-fetch'
import type { SectionNote } from '@veritio/study-types'

// Available note sections
export type NoteSection = 'screening' | 'pre_study' | 'post_study' | 'survey' | 'cards' | 'categories'

export const NOTE_SECTION_LABELS: Record<NoteSection, string> = {
  screening: 'Screening Questions',
  pre_study: 'Pre-study Questions',
  post_study: 'Post-study Questions',
  survey: 'Survey',
  cards: 'Cards',
  categories: 'Categories',
}

export const NOTE_SECTIONS: NoteSection[] = ['screening', 'pre_study', 'post_study', 'survey', 'cards', 'categories']

export interface GroupedNotes {
  section: NoteSection
  label: string
  notes: SectionNote[]
}

/** Fetches all notes for a study across all sections, grouped by section. */
export function useAllStudyNotes(studyId: string) {
  const { data: session } = useSession()
  const user = session?.user
  const authFetch = useAuthFetch()

  const fetcher = useCallback(async () => {
    const results = await Promise.all(
      NOTE_SECTIONS.map(async (section) => {
        const response = await authFetch(`/api/studies/${studyId}/sections/${section}/notes`)
        if (!response.ok) {
          return { section, notes: [] as SectionNote[] }
        }
        const notes = await response.json()
        return { section, notes: notes as SectionNote[] }
      })
    )
    return results
  }, [authFetch, studyId])

  const swrKey = studyId ? `all-study-notes-${studyId}` : null

  const { data, error, isLoading, mutate } = useSWR<{ section: NoteSection; notes: SectionNote[] }[]>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000,
      keepPreviousData: true,
    }
  )

  const groupedNotes: GroupedNotes[] = useMemo(() => {
    if (!data) return []
    return data.map(({ section, notes }) => ({
      section,
      label: NOTE_SECTION_LABELS[section],
      notes: notes.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    }))
  }, [data])

  const allNotes = useMemo(() => {
    return groupedNotes.flatMap(g => g.notes)
  }, [groupedNotes])

  const getNotesBySection = useCallback((section: NoteSection): SectionNote[] => {
    const group = groupedNotes.find(g => g.section === section)
    return group?.notes || []
  }, [groupedNotes])

  const addNote = useCallback(async (section: NoteSection, content: string) => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    const authorName = user.name || user.email || 'Unknown User'

    const response = await authFetch(`/api/studies/${studyId}/sections/${section}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, authorName }),
    })

    if (!response.ok) {
      throw new Error('Failed to create note')
    }

    const newNote = await response.json() as SectionNote

    mutate((currentData) => {
      if (!currentData) return currentData
      return currentData.map(item => {
        if (item.section === section) {
          return {
            ...item,
            notes: [newNote, ...item.notes],
          }
        }
        return item
      })
    }, { revalidate: false })

    return newNote
  }, [authFetch, studyId, mutate, user])

  const deleteNote = useCallback(async (noteId: string, section: NoteSection) => {
    mutate((currentData) => {
      if (!currentData) return currentData
      return currentData.map(item => {
        if (item.section === section) {
          return {
            ...item,
            notes: item.notes.filter(note => note.id !== noteId),
          }
        }
        return item
      })
    }, { revalidate: false })

    const response = await authFetch(`/api/notes/section/${noteId}`, {
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
    groupedNotes,
    allNotes,
    totalCount: allNotes.length,
    getNotesBySection,
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
    addNote,
    deleteNote,
    currentUserId: user?.id,
  }
}
