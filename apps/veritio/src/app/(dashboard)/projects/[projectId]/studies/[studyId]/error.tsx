'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import { Button } from '@/components/ui/button'

export default function StudyError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const params = useParams()
  const projectId = params.projectId as string

  useEffect(() => {
    console.error('Study page error:', error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-8 w-8 text-amber-600" />
        </div>

        <div>
          <h1 className="text-2xl font-bold">Failed to load study</h1>
          <p className="text-muted-foreground mt-2">
            There was a problem loading this study. It may have been deleted or you may not have access.
          </p>
          {error.message && !error.message.includes('undefined') && (
            <p className="text-sm text-muted-foreground mt-2 bg-muted p-2 rounded font-mono">
              {error.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button asChild>
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
