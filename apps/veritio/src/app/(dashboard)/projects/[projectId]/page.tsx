import { getProject } from '@/lib/data/projects'
import { getStudiesByProjectWithCount } from '@/lib/data/studies'
import { ProjectDetailClient } from './project-detail-client'

// Force dynamic rendering to ensure cookies are available for auth
export const dynamic = 'force-dynamic'

interface ProjectPageProps {
  params: Promise<{ projectId: string }>
}

/**
 * Project detail page with server-side data prefetching.
 *
 * Performance pattern (SSR with SWR hydration):
 * 1. Server attempts auth and fetches project + studies in parallel
 * 2. If server-side auth succeeds, page renders instantly with prefetched data
 * 3. If server-side auth fails (Better Auth cookie issue), client component
 *    falls back to SWR client-side fetch where browser cookies work reliably
 * 4. SWR hydrates with initialData, handles subsequent updates
 */
export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params

  // Parallel fetch for maximum performance — only first 10 studies for fast SSR
  // May return null if server-side cookies are unavailable (known Better Auth issue)
  const [project, studiesPage] = await Promise.all([
    getProject(projectId),
    getStudiesByProjectWithCount(projectId, { limit: 10 }),
  ])

  return (
    <ProjectDetailClient
      projectId={projectId}
      initialProject={project}
      initialStudies={studiesPage.data}
      initialHasMore={studiesPage.hasMore}
    />
  )
}
