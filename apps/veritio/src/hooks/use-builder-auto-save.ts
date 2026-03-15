'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useSaveOnLeave } from './use-save-on-leave'

interface UseBuilderAutoSaveOptions {
  /** The save function - should capture data, call API, then mark saved with exact data */
  onSave: () => Promise<void>
  /** Whether there are unsaved changes */
  isDirty: boolean
  /** Debounce delay in ms (default: 2000) */
  delay?: number
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean
  /** Callback when save fails */
  onSaveError?: (error: Error) => void
}

interface UseBuilderAutoSaveReturn {
  /** Manually trigger immediate save (bypasses debounce) */
  saveNow: () => Promise<void>
  /** Cancel pending debounced save */
  cancelPendingSave: () => void
  /** Whether a save is currently in progress */
  isSaving: boolean
  /** Last error from save attempt */
  lastError: Error | null
}

export function useBuilderAutoSave({
  onSave,
  isDirty,
  delay = 2000,
  enabled = true,
  onSaveError,
}: UseBuilderAutoSaveOptions): UseBuilderAutoSaveReturn {
  // Use refs for callbacks to avoid stale closures
  const onSaveRef = useRef(onSave)
  const onSaveErrorRef = useRef(onSaveError)

  const [isSaving, setIsSaving] = useState(false)
  const [lastError, setLastError] = useState<Error | null>(null)

  const isMountedRef = useRef(true)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isDirtyRef = useRef(isDirty)
  const prevIsDirtyRef = useRef(isDirty)
  const isSavingRef = useRef(false)
  const pendingSaveRef = useRef(false)
  const lastSaveAttemptRef = useRef<number>(0)

  // Keep refs updated
  useEffect(() => { onSaveRef.current = onSave }, [onSave])
  useEffect(() => { onSaveErrorRef.current = onSaveError }, [onSaveError])
  useEffect(() => { isDirtyRef.current = isDirty }, [isDirty])
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  const cancelPendingSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
  }, [])

  // Core save execution
  const executeSave = useCallback(async () => {
    if (!isMountedRef.current || isSavingRef.current || !isDirtyRef.current) {
      if (isSavingRef.current && isDirtyRef.current) pendingSaveRef.current = true
      return
    }

    // Anti-thrashing: prevent saves more frequent than once per 500ms
    const MIN_SAVE_INTERVAL = 500
    const now = Date.now()
    const timeSinceLastSave = now - lastSaveAttemptRef.current

    if (timeSinceLastSave < MIN_SAVE_INTERVAL) {
      // Too soon - queue for later
      pendingSaveRef.current = true
      setTimeout(() => {
        if (isMountedRef.current && isDirtyRef.current) executeSave()
      }, MIN_SAVE_INTERVAL - timeSinceLastSave)
      return
    }

    lastSaveAttemptRef.current = now
    isSavingRef.current = true
    setIsSaving(true)
    setLastError(null)

    try {
      await onSaveRef.current()
    } catch (error) {
      if (isMountedRef.current) {
        const err = error instanceof Error ? error : new Error(String(error))
        setLastError(err)
        onSaveErrorRef.current?.(err)
      }
    } finally {
      isSavingRef.current = false
      if (isMountedRef.current) {
        setIsSaving(false)
        // Handle edits made during save
        if (pendingSaveRef.current) {
          pendingSaveRef.current = false
          setTimeout(() => {
            if (isMountedRef.current && isDirtyRef.current) executeSave()
          }, 100)
        }
      }
    }
  }, [])

  // Debounced save
  const debouncedSave = useCallback(() => {
    cancelPendingSave()
    debounceTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) executeSave()
    }, delay)
  }, [delay, executeSave, cancelPendingSave])

  // Manual immediate save
  const saveNow = useCallback(async () => {
    cancelPendingSave()
    if (isDirtyRef.current) await executeSave()
  }, [cancelPendingSave, executeSave])

  // Watch dirty state transitions
  useEffect(() => {
    if (!enabled) {
      prevIsDirtyRef.current = isDirty
      return
    }

    const wasDirty = prevIsDirtyRef.current
    const nowDirty = isDirty

    if (nowDirty && !wasDirty) debouncedSave() // Clean → dirty: start save
    if (nowDirty && wasDirty) debouncedSave() // Still dirty: restart timer
    if (!nowDirty && wasDirty) cancelPendingSave() // Dirty → clean: cancel

    prevIsDirtyRef.current = nowDirty
  }, [isDirty, enabled, debouncedSave, cancelPendingSave])

  // Save on leave (beforeunload + unmount)
  useSaveOnLeave({
    isDirty,
    onSave: executeSave,
    enabled,
    isSaving,
  })

  // Cleanup
  useEffect(() => () => cancelPendingSave(), [cancelPendingSave])

  return { saveNow, cancelPendingSave, isSaving, lastError }
}
