import { useEffect, useRef, useState } from 'react'

interface IdleCallbackOptions {
  /** Maximum time to wait before forcing execution (ms). Default: 1000 */
  timeout?: number
}

interface UseIdleCallbackOptions extends IdleCallbackOptions {
  /** Whether to skip the idle callback and run immediately */
  skipIdle?: boolean
}

/** Schedule a callback to run when the browser is idle. Falls back to setTimeout in Safari. */
export function useIdleCallback(
  callback: () => void,
  deps: React.DependencyList,
  options?: UseIdleCallbackOptions
): void {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const { timeout = 1000, skipIdle = false } = options ?? {}

  useEffect(() => {
    if (skipIdle) {
      callbackRef.current()
      return
    }

    // Check for requestIdleCallback support (not available in Safari)
    if (typeof requestIdleCallback === 'undefined') {
      // Fallback: setTimeout with minimal delay
      const timeoutId = setTimeout(() => callbackRef.current(), 1)
      return () => clearTimeout(timeoutId)
    }

    const idleId = requestIdleCallback(
      () => callbackRef.current(),
      { timeout }
    )

    return () => cancelIdleCallback(idleId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

interface UseIdleEffectResult {
  isPending: boolean
}

/** Like useIdleCallback but with loading state tracking. */
export function useIdleEffect(
  callback: () => void,
  deps: React.DependencyList,
  options?: UseIdleCallbackOptions
): UseIdleEffectResult {
  const [isPending, setIsPending] = useState(true)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const { timeout = 1000, skipIdle = false } = options ?? {}

  useEffect(() => {
    setIsPending(true)

    const execute = () => {
      callbackRef.current()
      setIsPending(false)
    }

    if (skipIdle) {
      execute()
      return
    }

    if (typeof requestIdleCallback === 'undefined') {
      const timeoutId = setTimeout(execute, 1)
      return () => clearTimeout(timeoutId)
    }

    const idleId = requestIdleCallback(execute, { timeout })
    return () => cancelIdleCallback(idleId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { isPending }
}

interface UseDeferredRenderOptions {
  delay?: number
  immediate?: boolean
}

/** Defer initial render of expensive components until after idle. */
export function useDeferredRender(options?: UseDeferredRenderOptions): boolean {
  const { delay = 0, immediate = false } = options ?? {}
  const [shouldRender, setShouldRender] = useState(immediate)

  useEffect(() => {
    if (immediate) return

    const scheduleRender = () => {
      if (delay > 0) {
        setTimeout(() => setShouldRender(true), delay)
      } else {
        setShouldRender(true)
      }
    }

    if (typeof requestIdleCallback === 'undefined') {
      setTimeout(scheduleRender, 1)
      return
    }

    const idleId = requestIdleCallback(scheduleRender, { timeout: 500 })
    return () => cancelIdleCallback(idleId)
  }, [delay, immediate])

  return shouldRender
}

/** Run a function during browser idle time (non-hook version). */
export function scheduleIdleTask(
  fn: () => void,
  options?: IdleCallbackOptions
): () => void {
  const { timeout = 1000 } = options ?? {}

  if (typeof requestIdleCallback === 'undefined') {
    const timeoutId = setTimeout(fn, 1)
    return () => clearTimeout(timeoutId)
  }

  const idleId = requestIdleCallback(fn, { timeout })
  return () => cancelIdleCallback(idleId)
}

/** Process items in chunks during idle time to prevent blocking. */
export async function processIdleChunks<T>(
  items: T[],
  processor: (item: T, index: number) => void,
  options?: {
    chunkSize?: number
    timeout?: number
    onProgress?: (progress: number) => void
  }
): Promise<void> {
  const { chunkSize = 50, timeout = 100, onProgress } = options ?? {}

  return new Promise((resolve) => {
    let index = 0

    const processChunk = () => {
      const end = Math.min(index + chunkSize, items.length)

      while (index < end) {
        processor(items[index], index)
        index++
      }

      const progress = (index / items.length) * 100
      onProgress?.(progress)

      if (index < items.length) {
        // Schedule next chunk
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(processChunk, { timeout })
        } else {
          setTimeout(processChunk, 0)
        }
      } else {
        resolve()
      }
    }

    processChunk()
  })
}
