'use client'

/**
 * Error Boundary for Results Page
 *
 * Catches errors thrown during server-side data fetching
 * and provides a user-friendly error UI with recovery options.
 *
 * Next.js automatically wraps the page in this error boundary.
 * Errors are automatically logged by Next.js error handling.
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/dashboard/header'
import { AlertCircle } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ResultsError({ error, reset }: ErrorProps) {
  // Next.js automatically logs errors with digest for tracking

  return (
    <>
      <Header title="Error Loading Results" />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl font-semibold">Something went wrong</h2>
          <p className="max-w-md text-muted-foreground">
            {error.message || 'Failed to load study results. This may be due to a network error or invalid study data.'}
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Button onClick={reset}>Try Again</Button>
          <Button variant="outline" asChild>
            <Link href="/projects">Back to Projects</Link>
          </Button>
        </div>
      </div>
    </>
  )
}
