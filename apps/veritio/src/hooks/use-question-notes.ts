'use client'

import type { QuestionNote } from '@veritio/study-types'
import { SWR_KEYS } from '@/lib/swr'
import { createNotesHook } from './create-notes-hook'

/** Fetches and manages question notes with SWR caching and optimistic updates. */
export const useQuestionNotes = createNotesHook<QuestionNote, [string, string]>({
  getSwrKey: (studyId, questionId) => SWR_KEYS.questionNotes(studyId, questionId),
  getDeleteEndpoint: (noteId) => `/api/notes/${noteId}`,
})
