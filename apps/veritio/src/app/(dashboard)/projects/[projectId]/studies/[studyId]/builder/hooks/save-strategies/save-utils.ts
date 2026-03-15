/**
 * Shared Save Utilities
 *
 * Common functions used across all save strategies for:
 * - Data snapshot capture (for Yjs collision detection)
 * - State comparison (to detect changes during save)
 * - API result handling
 * - Flow data saving
 */

import { toast } from '@/components/ui/sonner'
import { useAuthFetch } from '@/hooks'
import { withRetry, throwOnServerError } from '@/lib/utils/retry'
import { useStudyFlowBuilderStore } from '@/stores/study-flow-builder'
import type { FlowDataSnapshot, SetStatusFn } from './types'

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
export function captureFlowDataSnapshot(
  flowStore: ReturnType<typeof useStudyFlowBuilderStore.getState>
): FlowDataSnapshot {
  return JSON.parse(JSON.stringify({
    flowSettings: flowStore.flowSettings,
    screeningQuestions: flowStore.screeningQuestions,
    preStudyQuestions: flowStore.preStudyQuestions,
    postStudyQuestions: flowStore.postStudyQuestions,
    surveyQuestions: flowStore.surveyQuestions,
  }))
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
  return JSON.stringify({
    flowSettings: currentState.flowSettings,
    screeningQuestions: currentState.screeningQuestions,
    preStudyQuestions: currentState.preStudyQuestions,
    postStudyQuestions: currentState.postStudyQuestions,
    surveyQuestions: currentState.surveyQuestions,
  }) === JSON.stringify(sentFlowData)
}

/**
 * Marks flow as saved with the sent data, or updates snapshot to current state if changed.
 * When state changed during save (e.g., from Yjs updates), calls markClean() to update
 * the snapshot to current state, then sets saved status. The newer changes from Yjs
 * will trigger another save cycle.
 *
 * @param sentFlowData - The snapshot captured before API call
 * @param label - Label for debug logging (e.g., "Survey", "Card Sort")
 */
export function markFlowSavedIfUnchanged(
  sentFlowData: FlowDataSnapshot,
  _label: string
): void {
  if (isFlowStateUnchanged(sentFlowData)) {
    useStudyFlowBuilderStore.getState().markSavedWithData(sentFlowData)
  } else {
    // State changed during save (likely Yjs update) - skipping markSaved
    useStudyFlowBuilderStore.getState().markClean()
    useStudyFlowBuilderStore.setState({ saveStatus: 'saved', lastSavedAt: Date.now() })
  }
}

/**
 * Marks a version-based content store as saved.
 * If state is unchanged since the API call, marks saved with the exact sent data.
 * If state changed during save (e.g., Yjs update), bumps _savedVersion to current
 * _version so dirty detection resets, and the newer changes trigger another save cycle.
 *
 * @param store - The Zustand store (must have _version, _savedVersion, markSavedWithData)
 * @param sentData - Deep-cloned snapshot captured before the API call
 * @param currentDataFn - Function to extract current data fields for comparison
 */
export function markContentSavedIfUnchanged<TStore extends {
  getState: () => { _version: number; _savedVersion: number; markSavedWithData: (data: any) => void }
  setState: (partial: Record<string, unknown>) => void
}>(
  store: TStore,
  sentData: unknown,
  currentDataFn: () => unknown
): void {
  if (JSON.stringify(currentDataFn()) === JSON.stringify(sentData)) {
    store.getState().markSavedWithData(sentData)
  } else {
    const currentState = store.getState()
    store.setState({
      saveStatus: 'saved',
      lastSavedAt: Date.now(),
      _savedVersion: currentState._version,
    })
  }
}

/**
 * Collects valid flow questions (filters out empty question_text).
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
  return questions.filter(q => q.question_text.trim() !== '')
}

/**
 * Handles save results from Promise.allSettled.
 * Shows toast on partial failure and throws on any failure.
 * Suppresses toasts when offline (since that's expected behavior).
 *
 * @param savePromises - Array of save promises
 * @param setStatus - Status setter function
 */
export async function handleSaveResults(
  savePromises: Promise<Response>[],
  setStatus: SetStatusFn
): Promise<void> {
  const results = await Promise.allSettled(savePromises)

  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
  const successes = results.filter((r): r is PromiseFulfilledResult<Response> => r.status === 'fulfilled')

  // Check if we're offline - if so, don't spam error toasts
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

  if (failures.length > 0) {
    setStatus('error')
    const failedResponses = successes.filter(s => !s.value.ok)

    // Only show error toast if we're online (offline failures are expected)
    if (!isOffline) {
      toast.error('Some changes failed to save', {
        description: `${successes.length - failedResponses.length}/${results.length} operations succeeded. Please try again.`,
      })
    }
    throw new Error('Partial save failure')
  }

  const failedResponse = successes.find(s => !s.value.ok)
  if (failedResponse) {
    const errorBody = await failedResponse.value.json().catch(() => ({}))
    setStatus('error')

    // Only show error toast if we're online (offline failures are expected)
    if (!isOffline) {
      // Log detailed validation errors for debugging
      if (errorBody.details && Array.isArray(errorBody.details)) {
        console.error(`[Builder Save] Validation failed (${failedResponse.value.status} ${failedResponse.value.url}):`, JSON.stringify(errorBody.details, null, 2))
        // Show first validation error in toast
        const firstError = errorBody.details[0]
        const detailMessage = firstError
          ? `${firstError.path}: ${firstError.message}`
          : undefined
        toast.error(errorBody.error || 'Save failed', {
          description: detailMessage || `Status ${failedResponse.value.status}`,
        })
      } else {
        toast.error(errorBody.error || 'Save failed', {
          description: `Status ${failedResponse.value.status}`,
        })
      }
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

  return withRetry(() => authFetch(`/api/studies/${studyId}/flow-questions`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questions: allQuestions }),
  }).then(throwOnServerError))
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
  return withRetry(() => authFetch(`/api/studies/${studyId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      settings: extendedSettings,
      welcome_message: flowStore.flowSettings.welcome.message,
      thank_you_message: flowStore.flowSettings.thankYou.message,
    }),
  }).then(throwOnServerError))
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
