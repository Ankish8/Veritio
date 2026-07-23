'use client'

import { useCallback, useEffect, useState } from 'react'
import { AutosaveCoordinator } from '@/lib/autosave/autosave-coordinator'
import { useOnlineStatus } from '@/hooks/use-online-status'

interface UseAutoSaveOptions {
  onSave: () => void | Promise<void>
  isDirty: boolean
  /** Changes for every edit while dirty remains true. */
  changeToken?: unknown
  delay?: number
  enabled?: boolean
  onError?: (error: Error) => void
}

interface UseAutoSaveReturn {
  saveNow: () => Promise<void>
  cancel: () => void
  isSaving: boolean
  lastError: Error | null
  clearError: () => void
  retryCount: number
}

/** Shared latest-wins autosave for non-builder surfaces such as Recruit. */
export function useAutoSave({ onSave, isDirty, changeToken, delay = 500, enabled = true, onError }: UseAutoSaveOptions): UseAutoSaveReturn {
  const isOnline = useOnlineStatus()
  const [isSaving, setIsSaving] = useState(false)
  const [lastError, setLastError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const [coordinator] = useState(
    () =>
      new AutosaveCoordinator({
        debounceMs: delay,
        save: async () => onSave(),
        isDirty: () => isDirty,
        canSave: () => enabled && isOnline,
        onSavingChange: setIsSaving,
      })
  )

  useEffect(() => {
    coordinator.updateOptions({
      debounceMs: delay,
      save: async () => {
        try {
          await onSave()
          setLastError(null)
          setRetryCount(0)
        } catch (error) {
          const normalized = error instanceof Error ? error : new Error(String(error))
          setLastError(normalized)
          setRetryCount((count) => count + 1)
          onError?.(normalized)
          throw normalized
        }
      },
      isDirty: () => isDirty,
      canSave: () => enabled && isOnline,
      onSavingChange: setIsSaving,
    })
  }, [coordinator, delay, enabled, isDirty, isOnline, onError, onSave])

  useEffect(() => () => coordinator.dispose(), [coordinator])

  useEffect(() => {
    if (isDirty) coordinator.notifyChange()
    else coordinator.sync()
  }, [changeToken, isDirty, coordinator])

  useEffect(() => {
    coordinator.sync()
  }, [enabled, isOnline, coordinator])

  const saveNow = useCallback(async () => {
    await coordinator.flush()
  }, [coordinator])

  const cancel = useCallback(() => {
    coordinator.cancelPending()
  }, [coordinator])

  const clearError = useCallback(() => {
    setLastError(null)
    setRetryCount(0)
  }, [])

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

  return {
    saveNow,
    cancel,
    isSaving,
    lastError,
    clearError,
    retryCount,
  }
}
