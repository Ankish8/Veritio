'use client'

/**
 * ResultsEmptyState
 *
 * Empty state shown when there are no responses yet.
 */

import Link from 'next/link'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

export interface ResultsEmptyStateProps {
  projectId: string
  studyId: string
  studyStatus: string
}

export function ResultsEmptyState({ projectId, studyId, studyStatus }: ResultsEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <EmptyState
        icon={Users}
        title="No responses yet"
        description="Once participants complete your study, their responses will appear here with analysis visualizations."
        action={
          studyStatus === 'draft' ? (
            <Button asChild size="lg">
              <Link href={`/projects/${projectId}/studies/${studyId}/builder`}>
                Configure & Launch Study
              </Link>
            </Button>
          ) : undefined
        }
      />
    </div>
  )
}
