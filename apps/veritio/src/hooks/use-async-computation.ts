'use client'

import { useEffect, useState } from 'react'

export interface ComputationState<R> {
  result: R | null
  loading: boolean
  error: Error | null
}

/** Generic hook for async computations with loading and error states. */
export function useAsyncComputation<T, R>(
  computeFn: (data: T) => Promise<R>,
  data: T | null,
  deps: any[]
): ComputationState<R> {
  const [state, setState] = useState<ComputationState<R>>({
    result: null,
    loading: false,
    error: null,
  })

  useEffect(() => {
    if (data === null) {
      setState({ result: null, loading: false, error: null })
      return
    }

    let isMounted = true

    const executeComputation = async () => {
      setState({ result: null, loading: true, error: null })

      try {
        const result = await computeFn(data)

        if (isMounted) {
          setState({ result, loading: false, error: null })
        }
      } catch (error) {
        if (isMounted) {
          setState({
            result: null,
            loading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          })
        }
      }
    }

    executeComputation()

    return () => {
      isMounted = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
