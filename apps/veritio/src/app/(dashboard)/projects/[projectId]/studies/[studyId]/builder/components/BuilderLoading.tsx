'use client'

import Link from 'next/link'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { BuilderSkeleton } from '@/components/dashboard/skeletons'

/**
 * Loading state for the builder page.
 */
export function BuilderLoading() {
  return <BuilderSkeleton />
}

/**
 * Error state when study is not found or user doesn't have access.
 */
export function BuilderError({ projectId }: { projectId: string }) {
  return (
    <>
      <Header title="Study Not Found" />
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">This study doesn&apos;t exist or you don&apos;t have access.</p>
        <Button asChild>
          <Link href={`/projects/${projectId}`}>Back to Project</Link>
        </Button>
      </div>
    </>
  )
}
