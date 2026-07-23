'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from '@/components/ui/sonner'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning'
import { useStudyMetaStore, useMetaIsDirty } from '@/stores/study-meta-store'
import { AutosaveCoordinator } from '@/lib/autosave/autosave-coordinator'
import type { SaveStatus } from '@/components/builders/shared/types'

interface UseBuilderShellSaveOptions {
  studyId: string
  onSave: () => Promise<unknown>
  contentDirty: boolean
  contentSaveStatus: SaveStatus
  contentLastSavedAt: number | null
  /** Changes for every content/flow edit, not only clean/dirty transitions. */
  changeToken?: string | number
  isStoreHydrated: boolean
  /** When true, auto-save is deferred until the AI refresh completes. */
  isRefreshingContent?: boolean
  /** When true, all saves are blocked (viewer role). */
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
  changeToken,
  isStoreHydrated,
  isRefreshingContent = false,
  isReadOnly = false,
}: UseBuilderShellSaveOptions): UseBuilderShellSaveReturn {
  const isOnline = useOnlineStatus()
  const metaDirty = useMetaIsDirty()
  const meta = useStudyMetaStore((state) => state.meta)
  const metaSaveStatus = useStudyMetaStore((state) => state.saveStatus)
  const metaLastSavedAt = useStudyMetaStore((state) => state.lastSavedAt)

  const isDirty = contentDirty || metaDirty
  const canSave = isOnline && isStoreHydrated && !isRefreshingContent && !isReadOnly
  const lastSavedAt = Math.max(contentLastSavedAt || 0, metaLastSavedAt || 0) || null

  const [isSaving, setIsSaving] = useState(false)
  const [coordinator] = useState(
    () =>
      new AutosaveCoordinator({
        save: onSave,
        isDirty: () => isDirty,
        canSave: () => canSave,
        onSavingChange: setIsSaving,
      })
  )

  useEffect(() => {
    coordinator.updateOptions({
      save: onSave,
      isDirty: () => isDirty,
      canSave: () => canSave,
      onSavingChange: setIsSaving,
    })
  }, [canSave, coordinator, isDirty, onSave])

  useEffect(() => {
    coordinator.cancelPending()
    coordinator.sync()
  }, [coordinator, studyId])

  useEffect(() => () => coordinator.dispose(), [coordinator])

  // Every data edit changes either the explicit content/flow token or the meta
  // object reference, so true trailing debounce works while dirty remains true.
  useEffect(() => {
    if (isDirty) {
      coordinator.notifyChange()
    } else {
      coordinator.sync()
    }
  }, [changeToken, meta, isDirty, coordinator])

  // Hydration, AI refresh, read-only state, and connectivity pause/resume saves.
  useEffect(() => {
    coordinator.sync()
  }, [canSave, coordinator])

  useUnsavedChangesWarning(isDirty && !isReadOnly)

  const handleManualSave = useCallback(async () => {
    if (isReadOnly || !isDirty) return
    try {
      await coordinator.flush()
    } catch {
      toast.error('Failed to save changes', {
        description: 'Your draft is safe locally. Check your connection and try again.',
      })
      throw new Error('Failed to save changes')
    }
  }, [coordinator, isDirty, isReadOnly])

  // Flush while the page still has a chance to start authenticated requests.
  useEffect(() => {
    const flushIfNeeded = () => {
      void coordinator.flush().catch(() => {})
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushIfNeeded()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', flushIfNeeded)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', flushIfNeeded)
    }
  }, [coordinator])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void handleManualSave().catch(() => {})
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleManualSave])

  const saveStatus: SaveStatus = isSaving
    ? 'saving'
    : contentSaveStatus === 'error' || metaSaveStatus === 'error'
      ? 'error'
      : isDirty
        ? 'idle'
        : contentSaveStatus === 'saved' || metaSaveStatus === 'saved'
          ? 'saved'
          : 'idle'

  return {
    isDirty: isReadOnly ? false : isDirty,
    saveStatus,
    lastSavedAt,
    isSaving,
    handleManualSave,
  }
}
