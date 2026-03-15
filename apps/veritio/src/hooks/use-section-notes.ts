'use client'

import type { SectionNote } from '@veritio/study-types'
import type { FlowQuestionSection } from '@/services/types'
import { SWR_KEYS } from '@/lib/swr'
import { createNotesHook } from './create-notes-hook'

/** Fetches and manages section notes with SWR caching. */
export const useSectionNotes = createNotesHook<SectionNote, [string, FlowQuestionSection]>({
  getSwrKey: (studyId, section) => SWR_KEYS.sectionNotes(studyId, section),
  getDeleteEndpoint: (noteId) => `/api/notes/section/${noteId}`,
})
