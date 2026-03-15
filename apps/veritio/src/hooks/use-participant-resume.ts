'use client'

import useSWRImmutable from 'swr/immutable'

interface ResumeDataRaw {
  participantId: string
  sessionToken: string
  currentStep?: string
  currentQuestionIndex?: number
  savedResponses?: Array<{ questionId: string; value: unknown }>
}

export interface ResumeData {
  participantId: string
  sessionToken: string
  currentStep: string
  currentQuestionIndex: number
  responses: Array<{ questionId: string; value: unknown }>
}

interface UseParticipantResumeResult {
  resumeData: ResumeData | null
  isLoading: boolean
  error: string | null
  isResumable: boolean
}

async function resumeFetcher(url: string): Promise<{ data: ResumeData | null }> {
  const response = await fetch(url)

  if (!response.ok) {
    // Resume token invalid or expired - not an error, just no data
    return { data: null }
  }

  const result = await response.json()
  const raw = result.data as ResumeDataRaw | null

  if (!raw) {
    return { data: null }
  }

  // Normalize to match page's expected shape
  return {
    data: {
      participantId: raw.participantId,
      sessionToken: raw.sessionToken,
      currentStep: raw.currentStep || 'welcome',
      currentQuestionIndex: raw.currentQuestionIndex || 0,
      responses: raw.savedResponses || [],
    },
  }
}

/** Hook to validate and fetch resume data from a resume token (one-time immutable fetch). */
export function useParticipantResume(
  studyCode: string,
  resumeToken: string | null
): UseParticipantResumeResult {
  const cacheKey = resumeToken
    ? `/api/participate/${studyCode}/resume/${resumeToken}`
    : null

  const { data, error, isLoading } = useSWRImmutable(
    cacheKey,
    resumeFetcher
  )

  const resumeData = data?.data || null
  const isResumable = !!resumeData

  return {
    resumeData,
    isLoading,
    error: error?.message || null,
    isResumable,
  }
}
