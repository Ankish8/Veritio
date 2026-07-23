/**
 * Shared Save Utilities
 *
 * Common functions used across all save strategies for:
 * - Data snapshot capture (for Yjs collision detection)
 * - State comparison (to detect changes during save)
 * - API result handling
 * - Flow data saving
 */

import { useAuthFetch } from '@/hooks'
import { withRetry, throwOnServerError } from '@/lib/utils/retry'
import { useStudyFlowBuilderStore } from '@/stores/study-flow-builder'
import type { FlowDataSnapshot, SetStatusFn } from './types'

const AUTOSAVE_RETRY_OPTIONS = {
  maxAttempts: 3,
  initialDelayMs: 500,
  maxDelayMs: 4_000,
  timeoutMs: 10_000,
} as const

export function withAutosaveRetry<T>(operation: (signal?: AbortSignal) => Promise<T>): Promise<T> {
  return withRetry(operation, AUTOSAVE_RETRY_OPTIONS)
}

// UUID validation regex (RFC 4122 compliant)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validates if a string is a valid UUID
 */
export function isValidUUID(id: unknown): id is string {
  return typeof id === 'string' && UUID_REGEX.test(id)
}

/**
 * Captures a deep clone of flow data for snapshot comparison.
 * Must be called BEFORE the API call to capture the "sent" state.
 *
 * @param flowStore - Current flow store state
 * @returns Deep cloned flow data snapshot
 */
export function captureFlowDataSnapshot(flowStore: ReturnType<typeof useStudyFlowBuilderStore.getState>): FlowDataSnapshot {
  return JSON.parse(
    JSON.stringify({
      flowSettings: flowStore.flowSettings,
      screeningQuestions: flowStore.screeningQuestions,
      preStudyQuestions: flowStore.preStudyQuestions,
      postStudyQuestions: flowStore.postStudyQuestions,
      surveyQuestions: flowStore.surveyQuestions,
    })
  )
}

/**
 * Checks if flow state has changed during save (e.g., from Yjs updates).
 * If state changed, we skip marking as saved to avoid overwriting the Yjs snapshot.
 *
 * @param sentFlowData - The snapshot captured before API call
 * @returns true if state is unchanged, false if it changed during save
 */
export function isFlowStateUnchanged(sentFlowData: FlowDataSnapshot): boolean {
  const currentState = useStudyFlowBuilderStore.getState()
  return (
    JSON.stringify({
      flowSettings: currentState.flowSettings,
      screeningQuestions: currentState.screeningQuestions,
      preStudyQuestions: currentState.preStudyQuestions,
      postStudyQuestions: currentState.postStudyQuestions,
      surveyQuestions: currentState.surveyQuestions,
    }) === JSON.stringify(sentFlowData)
  )
}

/**
 * Acknowledges exactly the flow revision represented by the request.
 * Newer local/Yjs edits remain dirty and are picked up by the coordinator.
 *
 * @param sentFlowData - The snapshot captured before API call
 * @param label - Label for debug logging (e.g., "Survey", "Card Sort")
 */
export function markFlowSavedIfUnchanged(sentFlowData: FlowDataSnapshot, sentVersion: number, _label: string): void {
  useStudyFlowBuilderStore.getState().markSavedWithData(sentFlowData, sentVersion)
}

/**
 * Marks a version-based content store as saved.
 * If state is unchanged since the API call, marks saved with the exact sent data.
 * The saved revision advances only to the revision captured before the request.
 * If state changed during the request, the newer current revision stays dirty.
 *
 * @param store - The Zustand store (must have _version, _savedVersion, markSavedWithData)
 * @param sentData - Deep-cloned snapshot captured before the API call
 * @param currentDataFn - Function to extract current data fields for comparison
 */
export function markContentSavedIfUnchanged<
  TStore extends {
    getState: () => { _version: number; _savedVersion: number }
    setState: (partial: Record<string, unknown>) => void
  },
>(store: TStore, sentData: unknown, sentVersion: number, _currentDataFn: () => unknown): void {
  const currentState = store.getState()
  const acknowledgedVersion = Math.min(sentVersion, currentState._version)
  store.setState({
    _snapshot: sentData,
    _savedVersion: Math.max(currentState._savedVersion, acknowledgedVersion),
    saveStatus: currentState._version === acknowledgedVersion ? 'saved' : 'idle',
    lastSavedAt: Date.now(),
  })
}

/**
 * Collects every flow question, including incomplete local drafts.
 *
 * Launch validation is responsible for rejecting blank questions. Autosave must
 * persist the exact builder state; filtering here made the UI acknowledge data
 * that the server never received.
 *
 * @param flowStore - Flow store state
 * @param includesSurvey - Whether to include survey questions (for Survey study type)
 * @returns Array of valid questions
 */
export function collectValidQuestions(
  flowStore: ReturnType<typeof useStudyFlowBuilderStore.getState>,
  includesSurvey = false
): ReturnType<typeof useStudyFlowBuilderStore.getState>['screeningQuestions'] {
  const questions = [
    ...flowStore.screeningQuestions,
    ...(includesSurvey ? flowStore.surveyQuestions : []),
    ...flowStore.preStudyQuestions,
    ...flowStore.postStudyQuestions,
  ]
  return questions
}

/**
 * Handles save results from Promise.allSettled.
 * Throws on any failure. Presentation is owned by the trigger: autosave updates
 * header status silently, while manual/preview/launch callers show one toast.
 *
 * @param savePromises - Array of save promises
 * @param setStatus - Status setter function
 */
export async function handleSaveResults(savePromises: Promise<Response>[], setStatus: SetStatusFn): Promise<void> {
  const results = await Promise.allSettled(savePromises)

  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
  const successes = results.filter((r): r is PromiseFulfilledResult<Response> => r.status === 'fulfilled')

  if (failures.length > 0) {
    setStatus('error')
    throw new Error('Partial save failure')
  }

  const failedResponse = successes.find((s) => !s.value.ok)
  if (failedResponse) {
    const errorBody = await failedResponse.value.json().catch(() => ({}))
    setStatus('error')

    if (errorBody.details && Array.isArray(errorBody.details)) {
      console.error(
        `[Builder Save] Validation failed (${failedResponse.value.status} ${failedResponse.value.url}):`,
        JSON.stringify(errorBody.details, null, 2)
      )
    }

    throw new Error(errorBody.error || `Save failed with status ${failedResponse.value.status}`)
  }
}

/**
 * Saves flow questions to the API.
 *
 * @param studyId - Study ID
 * @param flowStore - Flow store state
 * @param authFetch - Auth-enabled fetch function
 * @param includesSurvey - Whether to include survey questions
 * @returns Promise for the flow questions save
 */
export function saveFlowQuestions(
  studyId: string,
  flowStore: ReturnType<typeof useStudyFlowBuilderStore.getState>,
  authFetch: ReturnType<typeof useAuthFetch>,
  includesSurvey = false
): Promise<Response> {
  const allQuestions = collectValidQuestions(flowStore, includesSurvey)

  return withAutosaveRetry((signal) =>
    authFetch(`/api/studies/${studyId}/flow-questions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: allQuestions }),
      signal,
    }).then(throwOnServerError)
  )
}

/**
 * Saves study settings (including flow settings and messages).
 *
 * @param studyId - Study ID
 * @param extendedSettings - Settings object with studyFlow included
 * @param flowStore - Flow store state (for welcome/thank you messages)
 * @param authFetch - Auth-enabled fetch function
 * @returns Promise for the settings save
 */
export function saveStudySettings(
  studyId: string,
  extendedSettings: unknown,
  flowStore: ReturnType<typeof useStudyFlowBuilderStore.getState>,
  authFetch: ReturnType<typeof useAuthFetch>
): Promise<Response> {
  return withAutosaveRetry((signal) =>
    authFetch(`/api/studies/${studyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: extendedSettings,
        welcome_message: flowStore.flowSettings.welcome.message,
        thank_you_message: flowStore.flowSettings.thankYou.message,
      }),
      signal,
    }).then(throwOnServerError)
  )
}

/**
 * Creates extended settings object with studyFlow embedded.
 *
 * @param settings - Base settings object
 * @param flowStore - Flow store state
 * @returns Extended settings with studyFlow
 */
export function extendSettings<T>(
  settings: T,
  flowStore: ReturnType<typeof useStudyFlowBuilderStore.getState>
): T & { studyFlow: typeof flowStore.flowSettings } {
  return { ...settings, studyFlow: flowStore.flowSettings }
}
