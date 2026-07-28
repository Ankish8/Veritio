'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { normalizeParticipantRedirect } from '@veritio/core/participant-redirect'

interface UseRedirectCountdownOptions {
  redirectUrl?: string
  redirectDelay?: number
}

export function useRedirectCountdown({ redirectUrl, redirectDelay }: UseRedirectCountdownOptions) {
  // Never navigate to the raw setting: a schemeless value resolves against the
  // study path and strands the participant on "Study not found".
  const target = useMemo(() => normalizeParticipantRedirect(redirectUrl), [redirectUrl])
  const [countdown, setCountdown] = useState(redirectDelay || 0)

  useEffect(() => {
    if (target && redirectDelay && redirectDelay > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            window.location.href = target
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [target, redirectDelay])

  const handleRedirect = useCallback(() => {
    if (target) {
      window.location.href = target
    }
  }, [target])

  /** Callers gate the Continue button on this, not on the raw setting. */
  return { countdown, handleRedirect, redirectUrl: target }
}
