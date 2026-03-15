import { useCallback, useEffect, useRef } from 'react'
import { registerFlush } from './flush-registry'

/**
 * Drop-in replacement for the manual debounce pattern used in every Draft* component.
 *
 * Returns a debounced emit function. When called, it waits `delay` ms before
 * invoking `onEmit`. If `flushAllPendingState()` is called (e.g. before "Open in Builder"),
 * the pending state is emitted immediately without waiting for the debounce.
 */
export function useDebouncedEmit<T>(
  onEmit: ((state: T) => void) | undefined,
  delay = 300,
): (state: T) => void {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const pendingRef = useRef<T | null>(null)
  const onEmitRef = useRef(onEmit)
  onEmitRef.current = onEmit // eslint-disable-line react-hooks/refs

  const emit = useCallback(
    (state: T) => {
      if (!onEmitRef.current) return
      pendingRef.current = state
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        pendingRef.current = null
        onEmitRef.current?.(state)
      }, delay)
    },
    [delay],
  )

  // Register flush: immediately emit pending state when flush is requested
  useEffect(() => {
    return registerFlush(() => {
      if (pendingRef.current !== null && onEmitRef.current) {
        clearTimeout(debounceRef.current)
        const state = pendingRef.current
        pendingRef.current = null
        onEmitRef.current(state)
      }
    })
  }, [])

  return emit
}
