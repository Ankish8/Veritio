import '@/app/(dashboard)/analysis.css'
import { Suspense } from 'react'
import { ResultsTabsSkeleton } from '@/components/dashboard/skeletons'
import { ProgressiveErrorBoundary } from '@/components/progressive-error-boundary'
import { logQuerySummary } from '@/lib/observability/query-tracking'

import { ResultsTabs } from './results-tabs'

async function QuerySummaryLogger() {
  await logQuerySummary()
  return null
}

interface ResultsPageProps {
  params: Promise<{ projectId: string; studyId: string }>
}

export const dynamic = 'force-dynamic'

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { projectId, studyId } = await params

  return (
    <>
      <Suspense fallback={<ResultsTabsSkeleton />}>
        <ProgressiveErrorBoundary fallback={<ResultsTabsSkeleton />}>
          <ResultsTabs studyId={studyId} projectId={projectId} />
        </ProgressiveErrorBoundary>
      </Suspense>

      <Suspense fallback={null}>
        <QuerySummaryLogger />
      </Suspense>
    </>
  )
}
