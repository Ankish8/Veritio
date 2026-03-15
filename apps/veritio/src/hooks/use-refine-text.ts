'use client'

import { useState, useRef, useCallback } from 'react'
import { useAuthFetch } from '@/hooks/use-auth-fetch'

export type RefineAction =
  | 'improve'
  | 'simplify'
  | 'improve_clarity'
  | 'make_concise'
  | 'expand'
  | 'fix_grammar'

export interface RefineResult {
  refined: string
  rationale: string
}

interface RefineParams {
  text: string
  action: RefineAction
  format: 'html' | 'plain'
  context?: string
}

export function useRefineText() {
  const authFetch = useAuthFetch()
  const [isRefining, setIsRefining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const refine = useCallback(
    async (params: RefineParams): Promise<RefineResult | null> => {
      // Cancel any in-flight request
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setIsRefining(true)
      setError(null)

      try {
        const response = await authFetch('/api/assistant/refine-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: controller.signal,
        })

        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          throw new Error(body.error || `Request failed (${response.status})`)
        }

        const data: RefineResult = await response.json()
        return data
      } catch (err: any) {
        if (err.name === 'AbortError') return null
        const message = err.message || 'Failed to refine text'
        setError(message)
        return null
      } finally {
        if (abortRef.current === controller) {
          setIsRefining(false)
        }
      }
    },
    [authFetch],
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsRefining(false)
    setError(null)
  }, [])

  return { refine, isRefining, error, reset }
}
