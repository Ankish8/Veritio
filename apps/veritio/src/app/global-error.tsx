'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * Global error boundary for the entire application.
 *
 * This catches errors that bubble up to the root level,
 * providing a last-resort error UI when something goes catastrophically wrong.
 *
 * Note: This component renders its own <html> and <body> tags
 * because it replaces the entire page content.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-50 dark:bg-background">
          <div className="max-w-md w-full bg-white dark:bg-card rounded-2xl shadow-lg p-8 text-center">
            {/* Error Icon */}
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>

            {/* Error Message */}
            <h1 className="text-2xl font-bold mb-2 text-foreground">
              Application Error
            </h1>
            <p className="text-muted-foreground mb-4">
              We encountered a critical error. Please try refreshing the page.
            </p>

            {/* Error ID for support */}
            {error.digest && (
              <p className="text-xs text-muted-foreground mb-6 font-mono bg-muted px-3 py-1.5 rounded inline-block">
                Error ID: {error.digest}
              </p>
            )}

            {/* Retry Button */}
            <div className="mt-6">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-foreground text-background rounded-lg font-medium hover:bg-foreground/90 transition-colors w-full"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-muted-foreground mt-6">
              If this problem persists, please contact support with the error ID above.
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
