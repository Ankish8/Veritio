'use client'
import { ErrorScreenBase } from '@veritio/study-flow/player'

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
