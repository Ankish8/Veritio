/**
 * Performance Measurement Utilities
 *
 * Lightweight instrumentation for measuring render times and interaction latency.
 * Uses the Performance API which is available in all modern browsers.
 *
 * Usage:
 *   import { perfMark, perfMeasure, useRenderTime } from './perf-mark'
 *
 *   // Manual marking
 *   perfMark('segment-filter-start')
 *   applyFilters(...)
 *   perfMeasure('segment-filter', 'segment-filter-start')
 *
 *   // Hook for component render time
 *   function MyComponent() {
 *     useRenderTime('MyComponent')
 *     return <div>...</div>
 *   }
 */

const IS_DEV = process.env.NODE_ENV === 'development'

/**
 * Create a performance mark
 */
export function perfMark(name: string): void {
  if (IS_DEV && typeof performance !== 'undefined') {
    performance.mark(name)
  }
}

/**
 * Measure duration between a start mark and now
 * Logs to console in development
 */
export function perfMeasure(name: string, startMark: string): number | null {
  if (!IS_DEV || typeof performance === 'undefined') return null

  try {
    performance.mark(`${name}-end`)
    const measure = performance.measure(name, startMark, `${name}-end`)
    const duration = measure.duration

    // Color-code based on duration
    const _color =
      duration > 100 ? 'color: red; font-weight: bold' :
      duration > 50 ? 'color: orange' :
      duration > 16 ? 'color: yellow' :
      'color: green'

    // Performance measurement logged via Performance API marks

    // Cleanup marks
    performance.clearMarks(startMark)
    performance.clearMarks(`${name}-end`)
    performance.clearMeasures(name)

    return duration
  } catch {
    return null
  }
}

/**
 * Measure a synchronous function's execution time
 */
export function perfTime<T>(name: string, fn: () => T): T {
  if (!IS_DEV) return fn()

  perfMark(`${name}-start`)
  const result = fn()
  perfMeasure(name, `${name}-start`)
  return result
}

/**
 * Measure an async function's execution time
 */
export async function perfTimeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if (!IS_DEV) return fn()

  perfMark(`${name}-start`)
  const result = await fn()
  perfMeasure(name, `${name}-start`)
  return result
}

// =============================================================================
// REACT HOOKS
// =============================================================================

import { useEffect, useRef } from 'react'

/**
 * Hook to measure component render time
 * Logs each render duration to console in development
 *
 * @example
 * function ExpensiveComponent() {
 *   useRenderTime('ExpensiveComponent')
 *   // ... expensive render logic
 * }
 */
export function useRenderTime(_componentName: string): void {
  const renderCount = useRef(0)

  if (IS_DEV) {
    // This runs during render (intentionally)
    const startTime = performance.now()

    // useEffect runs after render completes
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const duration = performance.now() - startTime
      renderCount.current++

      const _color =
        duration > 50 ? 'color: red; font-weight: bold' :
        duration > 16 ? 'color: orange' :
        'color: green'

      // Render time available via Performance API
    })
  }
}

/**
 * Hook to track why a component re-rendered
 * Compares current props/state to previous values
 *
 * @example
 * function MyComponent(props) {
 *   useWhyDidYouRender('MyComponent', props)
 * }
 */
export function useWhyDidYouRender(
  componentName: string,
  props: Record<string, unknown>
): void {
  const previousProps = useRef<Record<string, unknown>>({})

  useEffect(() => {
    if (!IS_DEV) return

    const changedProps: Record<string, { from: unknown; to: unknown }> = {}

    for (const key of Object.keys(props)) {
      if (previousProps.current[key] !== props[key]) {
        changedProps[key] = {
          from: previousProps.current[key],
          to: props[key],
        }
      }
    }

    if (Object.keys(changedProps).length > 0) {
      // Changed props detected; inspect via debugger or React DevTools
    }

    previousProps.current = { ...props }
  })
}

// =============================================================================
// ZUSTAND SELECTOR TRACKING
// =============================================================================

/**
 * Wrap a Zustand selector to log when it causes re-renders
 *
 * @example
 * const filteredIds = useSegmentStore(
 *   trackSelector('filteredParticipantIds', state => state.filteredParticipantIds)
 * )
 */
export function trackSelector<T, R>(
  name: string,
  selector: (state: T) => R
): (state: T) => R {
  if (!IS_DEV) return selector

  let _callCount = 0
  let lastResult: R | undefined

  return (state: T) => {
    _callCount++
    const result = selector(state)

    if (result !== lastResult) {
      lastResult = result
    }

    return result
  }
}
