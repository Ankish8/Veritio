'use client'

/**
 * useBuilderSave Hook
 *
 * Slim orchestrator hook that delegates save operations to study-type-specific strategies.
 * Each strategy handles the specific save logic for its study type while sharing common
 * utilities for Yjs collision detection, API handling, and state management.
 *
 * Architecture:
 * - This hook provides the public API (performContentSave)
 * - Strategies handle study-type-specific save logic
 * - Shared utilities handle common operations
 *
 * @see ./save-strategies/ for individual strategy implementations
 */

import { useCallback, useEffect, useRef } from 'react'
import { useAuthFetch } from '@/hooks'
import { useStudyFlowBuilderStore, selectFlowIsDirty } from '@/stores/study-flow-builder'
import { useStudyMetaStore, selectMetaIsDirty } from '@/stores/study-meta-store'
import { withRetry, throwIfNotOk } from '@/lib/utils/retry'
import type { Study } from '@veritio/study-types'
import type { BuilderStores } from './use-builder-stores'
import { getSaveStrategy, type SaveResult } from './save-strategies'

// Re-export SaveResult for consumers
export type { SaveResult }

/**
 * Hook for saving study content to the API.
 *
 * Optimized to only save what's actually dirty:
 * - Survey: saves flow settings and questions
 * - Card Sort: saves cards, categories, settings, and flow
 * - Tree Test: saves nodes, tasks, settings, and flow
 * - Prototype Test: saves tasks, prototype metadata, settings, and flow
 * - First Click: saves tasks, settings, and flow
 * - First Impression: saves designs, settings, and flow
 *
 * Note: A/B tests use SWR with immediate saves, so they're handled separately.
 *
 * Uses snapshot-based dirty detection to prevent "Saved" appearing for edits made during save.
 * This is critical for Yjs collaboration - we capture state BEFORE the API call and verify
 * it hasn't changed before marking as saved.
 *
 * @param studyId - The study ID
 * @param study - The study object (for study type)
 * @param stores - Builder stores for status updates
 * @returns Object with performContentSave function
 *
 * @example
 * ```tsx
 * const { performContentSave } = useBuilderSave(studyId, study, stores)
 *
 * // Trigger save (usually from auto-save or manual save button)
 * const result = await performContentSave()
 * if (result.saved) {
 *   console.log('Saved:', result.savedTypes)
 * }
 * ```
 */
export function useBuilderSave(studyId: string, study: Study | null, stores: BuilderStores) {
  const authFetch = useAuthFetch()

  const saveOnceRef = useRef<() => Promise<SaveResult>>(async () => ({
    saved: false,
    savedTypes: [],
  }))
  const inFlightRef = useRef<Promise<SaveResult> | null>(null)
  const rerunRequestedRef = useRef(false)

  useEffect(() => {
    saveOnceRef.current = async (): Promise<SaveResult> => {
      if (!study) return { saved: false, savedTypes: [] }

      // Get fresh dirty state at execution time to avoid stale closures
      const flowStore = useStudyFlowBuilderStore.getState()
      const isFlowDirty = selectFlowIsDirty(flowStore)

      // Get the appropriate strategy for this study type
      const strategy = getSaveStrategy(study.study_type)

      const contentAndFlowSave = strategy.save({
        studyId,
        study,
        flowStore,
        isFlowDirty,
        authFetch,
        stores,
      })

      // Metadata is an independent PATCH and can run alongside content/flow.
      // It always acknowledges the exact snapshot sent, never newer local edits.
      const metaSave = (async (): Promise<boolean> => {
        const metaState = useStudyMetaStore.getState()
        if (!selectMetaIsDirty(metaState)) return false

        const sentMeta = JSON.parse(JSON.stringify({ meta: metaState.meta }))
        metaState.setSaveStatus('saving')

        try {
          await withRetry(
            (signal) =>
              authFetch(`/api/studies/${studyId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: sentMeta.meta.title,
                  description: sentMeta.meta.description,
                  purpose: sentMeta.meta.purpose,
                  participant_requirements: sentMeta.meta.participantRequirements,
                  folder_id: sentMeta.meta.folderId,
                  file_attachments: sentMeta.meta.fileAttachments,
                  url_slug: sentMeta.meta.urlSlug,
                  language: sentMeta.meta.language,
                  password: sentMeta.meta.password,
                  session_recording_settings: sentMeta.meta.sessionRecordingSettings,
                  closing_rule: sentMeta.meta.closingRule,
                  response_prevention_settings: sentMeta.meta.responsePrevention,
                  email_notification_settings: sentMeta.meta.notificationSettings,
                  branding: sentMeta.meta.branding,
                  sharing_settings: sentMeta.meta.sharingSettings,
                }),
                signal,
              }).then(throwIfNotOk),
            {
              maxAttempts: 3,
              initialDelayMs: 500,
              maxDelayMs: 4_000,
              timeoutMs: 10_000,
            }
          )
          useStudyMetaStore.getState().markSavedWithData(sentMeta)
          return true
        } catch (error) {
          useStudyMetaStore.getState().setSaveStatus('error')
          throw error
        }
      })()

      // Wait for every domain to settle so a partial failure cannot allow the next
      // save flight to overlap requests that are still mutating the same study.
      const [contentResult, metaResult] = await Promise.allSettled([contentAndFlowSave, metaSave])

      if (contentResult.status === 'rejected') throw contentResult.reason
      if (metaResult.status === 'rejected') throw metaResult.reason

      const result = contentResult.value
      if (metaResult.value) {
        return {
          saved: true,
          savedTypes: [...result.savedTypes, 'meta'],
        }
      }
      return result
    }
  }, [authFetch, stores, study, studyId])

  /**
   * One shared flight for autosave, manual save, preview, and launch.
   * A trigger that arrives during a flight joins it and requests one fresh pass.
   */
  const performContentSave = useCallback((): Promise<SaveResult> => {
    if (inFlightRef.current) {
      rerunRequestedRef.current = true
      return inFlightRef.current
    }

    const run = async () => {
      const savedTypes = new Set<SaveResult['savedTypes'][number]>()
      let saved = false

      do {
        rerunRequestedRef.current = false
        const result = await saveOnceRef.current()
        saved ||= result.saved
        result.savedTypes.forEach((type) => savedTypes.add(type))
      } while (rerunRequestedRef.current)

      return { saved, savedTypes: Array.from(savedTypes) }
    }

    const flight = run()
    inFlightRef.current = flight
    void flight
      .finally(() => {
        if (inFlightRef.current === flight) inFlightRef.current = null
      })
      .catch(() => {})
    return flight
  }, [])

  return { performContentSave }
}
