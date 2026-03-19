'use client'

import { useState, useCallback } from 'react'
import { getAuthFetchInstance } from '@/lib/swr'

export function useAiModelsList() {
  const [modelsByProvider, setModelsByProvider] = useState<Record<string, string[]>>({})
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fetchModels = useCallback(async (provider: 'openai' | 'mercury') => {
    const authFetch = getAuthFetchInstance()
    setLoadingProvider(provider)
    setError(null)
    try {
      const res = await authFetch('/api/assistant/list-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      const data = await res.json()
      setModelsByProvider(prev => ({ ...prev, [provider]: data.models ?? [] }))
      if (data.error) setError(data.error)
      return data.models ?? []
    } catch {
      setError('Failed to fetch models')
      return []
    } finally {
      setLoadingProvider(null)
    }
  }, [])

  return { modelsByProvider, loadingProvider, fetchModels, error }
}
