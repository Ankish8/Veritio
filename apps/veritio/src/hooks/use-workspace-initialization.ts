'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useOrganizations } from './use-organizations'
import { getAuthFetchInstance } from '@/lib/swr'

interface WorkspaceInitializationResult {
  isInitializing: boolean
  hasWorkspace: boolean
  wasInitialized: boolean
}

/** Detects new users with no orgs and auto-initializes their workspace. */
export function useWorkspaceInitialization(): WorkspaceInitializationResult {
  const { organizations, isLoading, error, refetch } = useOrganizations()
  const [isInitializing, setIsInitializing] = useState(false)
  const [wasInitialized, setWasInitialized] = useState(false)
  const initAttemptedRef = useRef(false)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const cleanup = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isLoading || initAttemptedRef.current) return

    // Don't trigger initialization if the organizations request failed.
    // A 503/timeout means the backend is temporarily unavailable, NOT that
    // the user has no organizations. Without this guard, any backend outage
    // would show "Creating your workspace" for all existing users.
    if (error) return

    if (organizations.length > 0) return

    initAttemptedRef.current = true
    setIsInitializing(true)

    const initializeWorkspace = async () => {
      try {
        const authFetch = getAuthFetchInstance()

        // 15s timeout — dismiss spinner so user sees empty state instead of infinite loading
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15_000)

        const response = await authFetch('/api/user/initialize-workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          setIsInitializing(false)
          return
        }

        const data = await response.json()

        if (data.initialized) {
          setWasInitialized(true)

          let attempts = 0
          const maxAttempts = 10

          pollIntervalRef.current = setInterval(async () => {
            attempts++
            await refetch()

            if (attempts >= maxAttempts) {
              cleanup()
              setIsInitializing(false)
            }
          }, 1000)
        } else {
          setIsInitializing(false)
          await refetch()
        }
      } catch {
        setIsInitializing(false)
      }
    }

    initializeWorkspace()

    return cleanup
  }, [isLoading, error, organizations.length, refetch, cleanup])

  useEffect(() => {
    if (organizations.length > 0 && isInitializing) {
      cleanup()
      setIsInitializing(false)
    }
  }, [organizations.length, isInitializing, cleanup])

  return {
    isInitializing,
    hasWorkspace: organizations.length > 0,
    wasInitialized,
  }
}
