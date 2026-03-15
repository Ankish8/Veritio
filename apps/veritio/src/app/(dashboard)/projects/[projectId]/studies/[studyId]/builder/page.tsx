/**
 * Builder Page - Server Component (RSC Streaming)
 *
 * Main entry point for study builder with progressive rendering.
 * Uses streaming for fast perceived performance.
 *
 * STREAMING ARCHITECTURE:
 * - Content streamed with Suspense (flow questions + type-specific data)
 * - React cache() deduplicates queries across boundaries
 * - Header and nav are rendered by BuilderShell (within BuilderContent)
 *
 * QUERY OPTIMIZATION:
 * - Fetches study + project metadata once
 * - Passes to BuilderContent which renders BuilderShell with header/nav
 */

import { Suspense } from 'react'
import { BuilderContentSkeleton } from '@/components/dashboard/skeletons'
import { ProgressiveErrorBoundary } from '@/components/progressive-error-boundary'
import { getStudyMetadata, getProjectMetadata } from '@/app/(dashboard)/lib/cached-queries'
import { logQuerySummary } from '@/lib/observability/query-tracking'

// Streaming server components
import { BuilderContent } from './builder-content'

/**
 * Query summary logger component.
 * Renders after all content and logs the request query summary.
 * Uses React cache() so it only logs once per request.
 */
async function QuerySummaryLogger() {
  await logQuerySummary()
  return null
}

interface BuilderPageProps {
  params: Promise<{ projectId: string; studyId: string }>
}

// Disable caching for builder pages (user-specific, frequently changing)
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function BuilderPage({ params }: BuilderPageProps) {
  const { projectId, studyId } = await params

  // NO data fetching here - data is fetched inside Suspense boundary
  // This enables progressive rendering instead of blocking
  return (
    <>
      <Suspense fallback={<BuilderContentSkeleton />}>
        <ProgressiveErrorBoundary fallback={<BuilderContentSkeleton />}>
          <BuilderContentShellWrapper studyId={studyId} projectId={projectId} />
        </ProgressiveErrorBoundary>
      </Suspense>

      {/* Log query summary after all queries complete */}
      <Suspense fallback={null}>
        <QuerySummaryLogger />
      </Suspense>
    </>
  )
}

/**
 * Wrapper to fetch metadata and pass to BuilderContent
 * Enables streaming while avoiding duplicate queries
 */
async function BuilderContentShellWrapper({ studyId, projectId }: { studyId: string; projectId: string }) {
  const [study, project] = await Promise.all([
    getStudyMetadata(studyId),
    getProjectMetadata(projectId),
  ])

  return <BuilderContent studyId={studyId} projectId={projectId} study={study} project={project} />
}
