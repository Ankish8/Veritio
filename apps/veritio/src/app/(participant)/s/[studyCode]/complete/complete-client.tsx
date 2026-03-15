'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { CheckCircle, XCircle, Users, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type CompletionStatus = 'complete' | 'screenout' | 'quota_full'

interface RedirectSettings {
  completionUrl?: string
  screenoutUrl?: string
  quotaFullUrl?: string
  redirectDelay?: number
}

interface Branding {
  primaryColor?: string
  logo?: { url: string }
}

interface CompleteClientProps {
  status: CompletionStatus
  thankYouMessage?: string
  redirectSettings?: RedirectSettings
  branding?: Branding
}

const STATUS_CONFIG = {
  complete: {
    icon: CheckCircle,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    title: 'Study Complete!',
    defaultMessage: 'Thank you for participating in our study! Your input helps us create better user experiences.',
  },
  screenout: {
    icon: XCircle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    title: "You don't qualify",
    defaultMessage: "Unfortunately, you don't meet the criteria for this study. Thank you for your interest!",
  },
  quota_full: {
    icon: Users,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    title: 'Study Full',
    defaultMessage: 'This study has reached its maximum number of participants. Thank you for your interest!',
  },
}

export function CompleteClient({
  status,
  thankYouMessage,
  redirectSettings,
  branding,
}: CompleteClientProps) {
  const [countdown, setCountdown] = useState<number | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  const redirectUrl = useMemo(() => {
    if (!redirectSettings) return null
    switch (status) {
      case 'complete':
        return redirectSettings.completionUrl
      case 'screenout':
        return redirectSettings.screenoutUrl
      case 'quota_full':
        return redirectSettings.quotaFullUrl
      default:
        return null
    }
  }, [status, redirectSettings])
  const delay = redirectSettings?.redirectDelay ?? 5

  // Initialize countdown if redirect URL exists
  useEffect(() => {
    if (redirectUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCountdown(delay)
    }
  }, [redirectUrl, delay])

  // Countdown timer
  useEffect(() => {
    if (countdown === null || countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  // Auto-redirect when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && redirectUrl && !redirecting) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRedirecting(true)
      window.location.href = redirectUrl
    }
  }, [countdown, redirectUrl, redirecting])

  // Manual redirect handler
  const handleRedirectNow = useCallback(() => {
    if (redirectUrl) {
      setRedirecting(true)
      window.location.href = redirectUrl
    }
  }, [redirectUrl])

  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  const message = thankYouMessage || config.defaultMessage

  // Apply branding color to primary button if available
  const buttonStyle = branding?.primaryColor
    ? { backgroundColor: branding.primaryColor }
    : undefined

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-stone-50">
      <div className="w-full max-w-lg rounded-2xl border bg-white p-8 shadow-sm text-center">
        {/* Logo if available */}
        {branding?.logo?.url && (
          <div className="mb-6">
{/* eslint-disable-next-line @next/next/no-img-element -- external branding URL, not optimizable */}
            <img
              src={branding.logo.url}
              alt="Study logo"
              className="h-12 mx-auto object-contain"
            />
          </div>
        )}

        {/* Status icon */}
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${config.iconBg}`}>
          <Icon className={`h-8 w-8 ${config.iconColor}`} />
        </div>

        {/* Title and message */}
        <h1 className="text-2xl font-bold text-stone-900">{config.title}</h1>
        <p className="mt-4 text-stone-600">{message}</p>

        {/* Redirect section */}
        {redirectUrl && (
          <div className="mt-6 space-y-3">
            {countdown !== null && countdown > 0 && (
              <p className="text-sm text-stone-500">
                Redirecting in <span className="font-medium">{countdown}</span> second{countdown !== 1 ? 's' : ''}...
              </p>
            )}

            {redirecting && (
              <p className="text-sm text-stone-500">Redirecting...</p>
            )}

            <Button
              onClick={handleRedirectNow}
              disabled={redirecting}
              style={buttonStyle}
              className={buttonStyle ? 'text-white hover:opacity-90' : ''}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Continue Now
            </Button>
          </div>
        )}

        {/* Close message if no redirect */}
        {!redirectUrl && (
          <p className="mt-6 text-sm text-stone-500">
            You may now close this window.
          </p>
        )}
      </div>
    </div>
  )
}
