import { ProjectsClient } from './projects-client'
import { getProjects } from '@/lib/data/projects'

// Force dynamic rendering to ensure cookies are available for auth
export const dynamic = 'force-dynamic'

/**
 * Projects page with server-side data prefetching.
 *
 * Performance pattern (SSR with SWR hydration):
 * 1. Server checks auth and fetches projects data
 * 2. Page renders instantly with prefetched data (no skeleton)
 * 3. SWR hydrates with initialData, handles subsequent updates
 *
 * Benefits:
 * - Zero loading spinners on initial load
 * - SWR still caches and revalidates for subsequent visits
 * - Mutations (create, delete, archive) still work via SWR
 */
export default async function ProjectsPage() {
  // Server-side fetch for instant load
  const projects = await getProjects()

  return <ProjectsClient initialData={projects} />
}
