/**
 * Player Responses Store
 *
 * Manages participant data and responses during the study flow.
 * - Question responses (Map of questionId -> response)
 * - Participant identification (email, custom, demographic)
 * - Consent and screening state
 * - Activity completion status
 *
 * @module stores/study-flow-player/stores/responses-store
 */

import { create } from 'zustand'
import type { ResponseValue, ParticipantDemographicData } from '@veritio/study-types/study-flow-types'
import type { QuestionResponse } from '../types'

// =============================================================================
// TYPES
// =============================================================================

export type IdentifierType = 'anonymous' | 'email' | 'custom' | 'demographic_profile'
export type ScreeningResult = 'passed' | 'rejected'

export interface PlayerResponsesState {
  // Responses
  responses: Map<string, QuestionResponse>

  // Participant identification
  participantIdentifier: string | null
  identifierType: IdentifierType | null
  participantDemographicData: ParticipantDemographicData | null

  // Flow state
  agreedToTerms: boolean
  screeningResult: ScreeningResult | null
  activityComplete: boolean

  // Actions
  setResponse: (questionId: string, value: ResponseValue, timeSpentMs?: number) => void
  setParticipantIdentifier: (value: string, type: 'email' | 'custom') => void
  setParticipantDemographicData: (data: ParticipantDemographicData) => void
  setAgreedToTerms: (agreed: boolean) => void
  setScreeningResult: (result: ScreeningResult) => void
  setActivityComplete: (complete: boolean) => void
  getResponse: (questionId: string) => ResponseValue | undefined
  getAllResponses: () => QuestionResponse[]
  restoreResponses: (responses: Array<{ questionId: string; value: ResponseValue }>) => void
  reset: () => void
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState = {
  responses: new Map<string, QuestionResponse>(),
  participantIdentifier: null as string | null,
  identifierType: null as IdentifierType | null,
  participantDemographicData: null as ParticipantDemographicData | null,
  agreedToTerms: false,
  screeningResult: null as ScreeningResult | null,
  activityComplete: false,
}

// =============================================================================
// STORE
// =============================================================================

export const usePlayerResponsesStore = create<PlayerResponsesState>()((set, get) => ({
  ...initialState,

  setResponse: (questionId, value, timeSpentMs) => {
    const { responses } = get()
    const newResponses = new Map(responses)
    newResponses.set(questionId, {
      questionId,
      value,
      timestamp: Date.now(),
      timeSpentMs,
    })
    set({ responses: newResponses })
  },

  setParticipantIdentifier: (value, type) => {
    set({ participantIdentifier: value, identifierType: type })
  },

  setParticipantDemographicData: (data) => {
    set({
      participantDemographicData: data,
      identifierType: 'demographic_profile',
      participantIdentifier: data.email || null,
    })
  },

  setAgreedToTerms: (agreed) => set({ agreedToTerms: agreed }),

  setScreeningResult: (result) => set({ screeningResult: result }),

  setActivityComplete: (complete) => set({ activityComplete: complete }),

  getResponse: (questionId) => get().responses.get(questionId)?.value,

  getAllResponses: () => Array.from(get().responses.values()),

  restoreResponses: (responses) => {
    const responsesMap = new Map<string, QuestionResponse>()
    for (const r of responses) {
      responsesMap.set(r.questionId, {
        questionId: r.questionId,
        value: r.value,
        timestamp: Date.now(),
      })
    }
    set({ responses: responsesMap })
  },

  reset: () => set({ ...initialState, responses: new Map() }),
}))

// =============================================================================
// SELECTORS
// =============================================================================

export const useResponses = () => usePlayerResponsesStore((s) => s.responses)
export const useParticipantIdentifier = () => usePlayerResponsesStore((s) => s.participantIdentifier)
export const useIdentifierType = () => usePlayerResponsesStore((s) => s.identifierType)
export const useAgreedToTerms = () => usePlayerResponsesStore((s) => s.agreedToTerms)
export const useScreeningResult = () => usePlayerResponsesStore((s) => s.screeningResult)
export const useActivityComplete = () => usePlayerResponsesStore((s) => s.activityComplete)

/**
 * Check if a specific question has been answered
 */
export const useHasResponse = (questionId: string) =>
  usePlayerResponsesStore((s) => s.responses.has(questionId))

/**
 * Get the response count
 */
export const useResponseCount = () =>
  usePlayerResponsesStore((s) => s.responses.size)
