'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseRedirectCountdownOptions {
  redirectUrl?: string
  redirectDelay?: number
}

export function useRedirectCountdown({ redirectUrl, redirectDelay }: UseRedirectCountdownOptions) {
  const [countdown, setCountdown] = useState(redirectDelay || 0)

  useEffect(() => {
    if (redirectUrl && redirectDelay && redirectDelay > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            window.location.href = redirectUrl
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [redirectUrl, redirectDelay])

  const handleRedirect = useCallback(() => {
    if (redirectUrl) {
      window.location.href = redirectUrl
    }
  }, [redirectUrl])

  return { countdown, handleRedirect }
}
