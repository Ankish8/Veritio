'use client'

import { ErrorScreenBase } from '@/components/players/shared/screen-layout'

interface ErrorScreenProps {
  errorMessage: string
  onRetry?: () => void
}

export function ErrorScreen({ errorMessage, onRetry }: ErrorScreenProps) {
  return (
    <ErrorScreenBase
      message={errorMessage}
      onRetry={onRetry || (() => window.location.reload())}
    />
  )
}
