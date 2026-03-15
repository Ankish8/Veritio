'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { toast } from '@/components/ui/sonner'
import { useAuthFetch } from '@/hooks'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning'
import { useStudyMetaStore, useMetaIsDirty, selectMetaIsDirty } from '@/stores/study-meta-store'
import { withRetry } from '@/lib/utils/retry'
import type { SaveStatus } from '@/components/builders/shared/types'

const AUTO_SAVE_DELAY = 1000

interface UseBuilderShellSaveOptions {
  studyId: string
  onSave: () => Promise<unknown>
  contentDirty: boolean
  contentSaveStatus: SaveStatus
  contentLastSavedAt: number | null
  isStoreHydrated: boolean
  /** When true, auto-save is deferred until the AI refresh completes */
  isRefreshingContent?: boolean
  /** When true, all saves are blocked (viewer role) */
  isReadOnly?: boolean
}

interface UseBuilderShellSaveReturn {
  isDirty: boolean
  saveStatus: SaveStatus
  lastSavedAt: number | null
  isSaving: boolean
  handleManualSave: () => Promise<void>
}

export function useBuilderShellSave({
  studyId,
  onSave,
  contentDirty,
  contentSaveStatus,
  contentLastSavedAt,
  isStoreHydrated,
  isRefreshingContent = false,
  isReadOnly = false,
}: UseBuilderShellSaveOptions): UseBuilderShellSaveReturn {
  const authFetch = useAuthFetch()
  const isOnline = useOnlineStatus()
  const prevIsOnlineRef = useRef(isOnline)
  const metaDirty = useMetaIsDirty()

  // Use individual selectors to avoid re-rendering on every store field change
  const metaSaveStatus = useStudyMetaStore((s) => s.saveStatus)
  const metaLastSavedAt = useStudyMetaStore((s) => s.lastSavedAt)
  const setMetaSaveStatus = useStudyMetaStore((s) => s.setSaveStatus)

  const isDirty = contentDirty || metaDirty
  const lastSavedAt = Math.max(contentLastSavedAt || 0, metaLastSavedAt || 0) || null

  // CRITICAL: Use both React state (for UI) and ref (for synchronous lock)
  const [isSaving, setIsSaving] = useState(false)
  const isSavingRef = useRef(false)
  const pendingSaveRef = useRef(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Store unstable callbacks in refs to break the reference cascade.
  // `onSave` (performContentSave) changes every render because useBuilderStores returns
  // a new object each render. Without refs, performSave → executeSave → auto-save effect
  // all get new identities every render, causing React's update depth limit to be hit.
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave
  const contentDirtyRef = useRef(contentDirty)
  contentDirtyRef.current = contentDirty

  // Show browser warning when leaving with unsaved changes (skip for viewers)
  useUnsavedChangesWarning(isDirty && !isReadOnly)

  // Combined save function
  // showErrorToast: true for manual saves, false for auto-saves
  const performSave = useCallback(async (showErrorToast = true) => {
    if (isReadOnly) return

    const storeState = useStudyMetaStore.getState()
    const currentMetaDirty = selectMetaIsDirty(storeState)
    const freshMeta = storeState.meta

    try {
      await onSaveRef.current()

      if (currentMetaDirty) {
        const sentMeta = JSON.parse(JSON.stringify({ meta: freshMeta }))
        setMetaSaveStatus('saving')

        const metaResponse = await withRetry(() => authFetch(`/api/studies/${studyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: freshMeta.title,
            description: freshMeta.description,
            purpose: freshMeta.purpose,
            participant_requirements: freshMeta.participantRequirements,
            folder_id: freshMeta.folderId,
            file_attachments: freshMeta.fileAttachments,
            url_slug: freshMeta.urlSlug,
            language: freshMeta.language,
            password: freshMeta.password,
            session_recording_settings: freshMeta.sessionRecordingSettings,
            closing_rule: freshMeta.closingRule,
            response_prevention_settings: freshMeta.responsePrevention,
            email_notification_settings: freshMeta.notificationSettings,
            branding: freshMeta.branding,
          }),
        }))

        if (!metaResponse.ok) {
          throw new Error('Failed to save study metadata')
        }

        const currentMetaState = useStudyMetaStore.getState()
        const metaUnchanged = JSON.stringify({ meta: currentMetaState.meta }) === JSON.stringify(sentMeta)

        if (metaUnchanged) {
          useStudyMetaStore.getState().markSavedWithData(sentMeta)
        } else {
          useStudyMetaStore.getState().markSaved()
        }
      }
    } catch (error) {
      if (showErrorToast) {
        setMetaSaveStatus('error')
        toast.error('Failed to save changes', {
          description: 'Please try again or check your connection.',
        })
      }
      throw error
    }
  }, [studyId, setMetaSaveStatus, authFetch, isReadOnly])

  // Core save execution with synchronous lock
  const executeSave = useCallback(async () => {
    if (!isOnline || isSavingRef.current) {
      if (isSavingRef.current) pendingSaveRef.current = true
      return
    }

    isSavingRef.current = true
    setIsSaving(true)

    try {
      await performSave(false)
    } catch {
      // Silently log - auto-save errors don't spam user
    } finally {
      isSavingRef.current = false
      setIsSaving(false)

      if (pendingSaveRef.current) {
        pendingSaveRef.current = false
        setTimeout(() => {
          if (contentDirtyRef.current || selectMetaIsDirty(useStudyMetaStore.getState())) {
            executeSave()
          }
        }, 100)
      }
    }
  }, [performSave, isOnline])

  // Auto-save with debounce
  // Skip auto-save while AI refresh is in progress to prevent overwriting AI-written data
  // (the store may have stale data until the refresh completes)
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }

    if (!isDirty || isSavingRef.current || !isStoreHydrated || !isOnline || isRefreshingContent || isReadOnly) {
      if (isDirty && isSavingRef.current) pendingSaveRef.current = true
      return
    }

    autoSaveTimerRef.current = setTimeout(() => executeSave(), AUTO_SAVE_DELAY)

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [isDirty, isStoreHydrated, isOnline, isRefreshingContent, isReadOnly, executeSave])

  // Save when coming back online
  useEffect(() => {
    const wasOffline = !prevIsOnlineRef.current
    if (wasOffline && isOnline && isDirty && !isSavingRef.current && isStoreHydrated) {
      setTimeout(() => executeSave(), 500)
    }
    prevIsOnlineRef.current = isOnline
  }, [isOnline, isDirty, isStoreHydrated, executeSave])

  // Manual save handler
  const handleManualSave = useCallback(async () => {
    if (isReadOnly || !isDirty || isSavingRef.current) return

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }

    isSavingRef.current = true
    setIsSaving(true)
    try {
      await performSave()
    } finally {
      isSavingRef.current = false
      setIsSaving(false)

      if (pendingSaveRef.current) {
        pendingSaveRef.current = false
        setTimeout(() => {
          if (contentDirtyRef.current || selectMetaIsDirty(useStudyMetaStore.getState())) {
            executeSave()
          }
        }, 100)
      }
    }
  }, [isReadOnly, isDirty, performSave, executeSave])

  // Cmd+S / Ctrl+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleManualSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleManualSave])

  // Combined save status
  const saveStatus: SaveStatus = isSaving
    ? 'saving'
    : contentSaveStatus === 'error' || metaSaveStatus === 'error'
      ? 'error'
      : isDirty
        ? 'idle'
        : 'saved'

  return { isDirty: isReadOnly ? false : isDirty, saveStatus, lastSavedAt, isSaving, handleManualSave }
}
