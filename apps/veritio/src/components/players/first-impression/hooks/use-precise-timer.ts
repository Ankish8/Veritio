import { useState, useRef, useCallback, useEffect } from 'react'

interface UsePreciseTimerOptions {
  durationMs: number
  onComplete?: () => void
  updateFrequency?: number
}

interface UsePreciseTimerReturn {
  remainingMs: number
  elapsedMs: number
  progress: number
  isRunning: boolean
  start: () => void
  pause: () => void
  reset: () => void
  startTime: number | null
}

export function usePreciseTimer({
  durationMs,
  onComplete,
  updateFrequency = 100,
}: UsePreciseTimerOptions): UsePreciseTimerReturn {
  const [remainingMs, setRemainingMs] = useState(durationMs)
  const [isRunning, setIsRunning] = useState(false)

  const startTimeRef = useRef<number | null>(null)
  const pausedElapsedRef = useRef(0)
  const rafIdRef = useRef<number | null>(null)
  const onCompleteRef = useRef(onComplete)
  const lastUpdateRef = useRef<number>(0)

  // Keep callback ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const tick = useCallback(() => {
    if (!startTimeRef.current) return

    const now = performance.now()
    const elapsed = pausedElapsedRef.current + (now - startTimeRef.current)
    const remaining = Math.max(0, durationMs - elapsed)

    // Only update state at configured frequency to avoid excessive renders
    if (now - lastUpdateRef.current >= updateFrequency || remaining === 0) {
      setRemainingMs(remaining)
      lastUpdateRef.current = now
    }

    if (remaining <= 0) {
      // Timer complete
      setIsRunning(false)
      rafIdRef.current = null
      onCompleteRef.current?.()
    } else {
      // Schedule next frame
      // eslint-disable-next-line react-hooks/immutability
      rafIdRef.current = requestAnimationFrame(tick)
    }
  }, [durationMs, updateFrequency])

  const start = useCallback(() => {
    if (isRunning) return

    startTimeRef.current = performance.now()
    setIsRunning(true)
    lastUpdateRef.current = 0 // Force immediate update
    rafIdRef.current = requestAnimationFrame(tick)
  }, [isRunning, tick])

  const pause = useCallback(() => {
    if (!isRunning || !startTimeRef.current) return

    // Store elapsed time before pause
    pausedElapsedRef.current += performance.now() - startTimeRef.current
    startTimeRef.current = null
    setIsRunning(false)

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }, [isRunning])

  const reset = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    startTimeRef.current = null
    pausedElapsedRef.current = 0
    lastUpdateRef.current = 0
    setRemainingMs(durationMs)
    setIsRunning(false)
  }, [durationMs])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])

  // Update remaining when duration changes (e.g., for next design)
  useEffect(() => {
    if (!isRunning) {
      setRemainingMs(durationMs)
    }
  }, [durationMs, isRunning])

  const elapsedMs = durationMs - remainingMs
  const progress = durationMs > 0 ? elapsedMs / durationMs : 0

  return {
    remainingMs,
    elapsedMs,
    progress,
    isRunning,
    start,
    pause,
    reset,
    startTime: startTimeRef.current,
  }
}
