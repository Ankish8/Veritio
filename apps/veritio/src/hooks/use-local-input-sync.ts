'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface UseLocalInputSyncOptions {
  /** Delay before syncing (default: 500ms) */
  debounceMs?: number
  /** Called when syncing to server */
  onSync?: (value: string) => Promise<void> | void
  /** Transform value before displaying (e.g., slugify) */
  transform?: (value: string) => string
}

/** Local input state that syncs on blur or after debounce. */
export function useLocalInputSync(
  initialValue: string,
  options: UseLocalInputSyncOptions = {}
) {
  const { debounceMs = 500, onSync, transform } = options

  const [value, setValueInternal] = useState(initialValue)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lastSyncedRef = useRef(initialValue)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Update local value when initialValue changes (e.g., from server)
  useEffect(() => {
    if (initialValue !== lastSyncedRef.current) {
      setValueInternal(initialValue)
      lastSyncedRef.current = initialValue
    }
  }, [initialValue])

  const sync = useCallback(
    async (newValue: string) => {
      if (newValue === lastSyncedRef.current) return

      setIsSyncing(true)
      setError(null)

      try {
        await onSync?.(newValue)
        lastSyncedRef.current = newValue
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sync failed')
        // Revert to last synced value on error
        setValueInternal(lastSyncedRef.current)
      } finally {
        setIsSyncing(false)
      }
    },
    [onSync]
  )

  const setValue = useCallback(
    (newValue: string) => {
      const transformedValue = transform ? transform(newValue) : newValue
      setValueInternal(transformedValue)
      setError(null)

      // Clear existing debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      // Set up new debounce if debounceMs > 0
      if (debounceMs > 0 && onSync) {
        debounceRef.current = setTimeout(() => {
          sync(transformedValue)
        }, debounceMs)
      }
    },
    [transform, debounceMs, onSync, sync]
  )

  const handleBlur = useCallback(() => {
    // Clear pending debounce and sync immediately
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    sync(value)
  }, [value, sync])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const reset = useCallback(() => {
    setValueInternal(initialValue)
    lastSyncedRef.current = initialValue
    setError(null)
  }, [initialValue])

  const isDirty = value !== lastSyncedRef.current

  return {
    value,
    setValue,
    handleBlur,
    reset,
    isSyncing,
    isDirty,
    error,
  }
}
