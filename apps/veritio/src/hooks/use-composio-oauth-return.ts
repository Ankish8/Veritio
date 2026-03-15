'use client'

import { useEffect, useRef } from 'react'
import { useFloatingActionBar } from '@/components/analysis/shared/floating-action-bar'

/**
 * Shared hook that checks for Composio OAuth return and auto-opens the AI panel.
 * Call this on any page that mounts the assistant.
 */
export function useComposioOAuthReturn() {
  const { setActivePanel } = useFloatingActionBar()
  const hasCheckedRef = useRef(false)

  useEffect(() => {
    if (hasCheckedRef.current) return
    hasCheckedRef.current = true

    const oauthPending = sessionStorage.getItem('composio_oauth_pending')
    if (oauthPending) {
      sessionStorage.removeItem('composio_oauth_pending')
      setActivePanel('ai-assistant')
    }
  }, [setActivePanel])
}
