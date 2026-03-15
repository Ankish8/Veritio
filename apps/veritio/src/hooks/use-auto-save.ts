'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'

interface UseAutoSaveOptions {
  /** The save function to call */
  onSave: () => void | Promise<void>
  /** Whether there are unsaved changes (computed from snapshot comparison) */
  isDirty: boolean
  /** Debounce delay in milliseconds (default: 500 for responsive feel) */
  delay?: number
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean
  /** Callback when an error occurs during save */
  onError?: (error: Error) => void
}

interface UseAutoSaveReturn {
  /** Manually trigger a save immediately */
  saveNow: () => void
  /** Cancel any pending save */
  cancel: () => void
  /** Whether a save is currently in progress */
  isSaving: boolean
  /** The last error that occurred during save, null if no error */
  lastError: Error | null
  /** Clear the last error */
  clearError: () => void
  /** Number of consecutive save failures */
  retryCount: number
}

/** Auto-saves data with debouncing, dirty-state transitions, and concurrent edit handling. */
export function useAutoSave({
  onSave,
  isDirty,
  delay = 500,
  enabled = true,
  onError,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const isMountedRef = useRef(true)
  const onSaveRef = useRef(onSave)
  const onErrorRef = useRef(onError)
  const [isSaving, setIsSaving] = useState(false)
  const [lastError, setLastError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Track previous dirty state to detect TRANSITIONS only
  const prevDirtyRef = useRef(isDirty)

  // Queue another save if changes made during save
  const pendingSaveRef = useRef(false)

  // Track if we've handled initial dirty state
  const hasHandledInitialDirtyRef = useRef(false)

  // Keep onSave reference updated
  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  // Keep onError reference updated
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  // Clear error helper
  const clearError = useCallback(() => {
    setLastError(null)
    setRetryCount(0)
  }, [])

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Debounced save - stable reference
  const debouncedSave = useDebouncedCallback(
    async () => {
      if (!isMountedRef.current) return

      setIsSaving(true)

      try {
        await onSaveRef.current()
        // Success - clear any previous error state
        if (isMountedRef.current) {
          setLastError(null)
          setRetryCount(0)
        }
      } catch (error) {
        // Save failed - update error state
        if (isMountedRef.current) {
          const err = error instanceof Error ? error : new Error(String(error))
          setLastError(err)
          setRetryCount((prev) => prev + 1)
          onErrorRef.current?.(err)
        }
        // Don't rethrow - let the UI handle the error state
      } finally {
        if (isMountedRef.current) {
          setIsSaving(false)

          // If changes were made during save, trigger another save
          if (pendingSaveRef.current) {
            pendingSaveRef.current = false
            // Use setTimeout to avoid immediate recursion
            setTimeout(() => {
              if (isMountedRef.current) {
                debouncedSave()
              }
            }, 0)
          }
        }
      }
    },
    delay,
    { leading: false, trailing: true }
  )

  // Handle initial dirty state on mount (e.g., from localStorage persistence)
  // This catches the case where page loads with pre-existing dirty state
  useEffect(() => {
    if (!enabled || hasHandledInitialDirtyRef.current) return

    // Only run once after mount
    hasHandledInitialDirtyRef.current = true

    // If dirty on initial load, trigger a save
    if (isDirty && !isSaving) {
      debouncedSave()
    }
  }, [enabled, isDirty, isSaving, debouncedSave])

  // Watch for dirty state TRANSITIONS only
  useEffect(() => {
    if (!enabled) {
      prevDirtyRef.current = isDirty
      return
    }

    const wasDirty = prevDirtyRef.current
    const nowDirty = isDirty

    // Only act on actual state changes
    if (wasDirty === nowDirty) {
      return // No change, do nothing
    }

    // Transitioning from clean to dirty: start debounced save
    if (nowDirty && !wasDirty && !isSaving) {
      debouncedSave()
    }

    // Transitioning from dirty to clean while saving: queue another check
    if (!nowDirty && wasDirty && isSaving) {
      // Save completed, no action needed
    }

    // If we become dirty while already saving, queue a pending save
    if (nowDirty && isSaving) {
      pendingSaveRef.current = true
    }

    // Transitioning from dirty to clean while NOT saving: cancel pending save
    if (!nowDirty && wasDirty && !isSaving) {
      debouncedSave.cancel()
      pendingSaveRef.current = false
    }

    prevDirtyRef.current = nowDirty
  }, [isDirty, enabled, isSaving, debouncedSave])

  // Manual save trigger
  const saveNow = useCallback(() => {
    debouncedSave.cancel()
    if (isMountedRef.current && isDirty) {
      setIsSaving(true)
      Promise.resolve(onSaveRef.current())
        .then(() => {
          // Success - clear error state
          if (isMountedRef.current) {
            setLastError(null)
            setRetryCount(0)
          }
        })
        .catch((error) => {
          // Save failed - update error state
          if (isMountedRef.current) {
            const err = error instanceof Error ? error : new Error(String(error))
            setLastError(err)
            setRetryCount((prev) => prev + 1)
            onErrorRef.current?.(err)
          }
        })
        .finally(() => {
          if (isMountedRef.current) {
            setIsSaving(false)
          }
        })
    }
  }, [debouncedSave, isDirty])

  // Cancel pending save
  const cancel = useCallback(() => {
    debouncedSave.cancel()
    pendingSaveRef.current = false
  }, [debouncedSave])

  return { saveNow, cancel, isSaving, lastError, clearError, retryCount }
}
