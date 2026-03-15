'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'

export default function BuilderError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const params = useParams()
  const projectId = params?.projectId as string

  return (
    <>
      <Header title="Error Loading Builder" />
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">
          {error.message || 'Failed to load study builder'}
        </p>
        <div className="flex gap-2">
          <Button onClick={reset}>Try Again</Button>
          {projectId && (
            <Button variant="outline" asChild>
              <Link href={`/projects/${projectId}`}>Back to Project</Link>
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
