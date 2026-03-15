'use client'

import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AdminErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function AdminErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: AdminErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <AlertCircle className="h-10 w-10 text-destructive mb-4" />
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}
