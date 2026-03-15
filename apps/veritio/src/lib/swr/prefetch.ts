'use client'

import { preload } from 'swr'
import { swrFetcher, swrFetcherUnwrap } from './fetcher'
import { SWR_KEYS } from './config'

/**
 * Network-aware prefetching helper.
 * Skips prefetching on slow connections or when data saver is enabled.
 * Helps reduce unnecessary network usage for high-latency users.
 *
 * @param prefetchFn - The prefetch function to call
 *
 * @example
 * ```tsx
 * <Link
 *   href="/projects"
 *   onMouseEnter={() => prefetchIfFast(prefetchProjects)}
 * >
 *   Projects
 * </Link>
 * ```
 */
export function prefetchIfFast(prefetchFn: () => void) {
  // Check if Network Information API is available
  const connection = (navigator as any).connection

  if (connection?.effectiveType && ['slow-2g', '2g'].includes(connection.effectiveType)) {
    return // Skip prefetch on slow connections
  }

  if (connection?.saveData) {
    return // Skip if data saver is enabled
  }

  prefetchFn()
}

/**
 * Prefetching utilities for common navigation patterns.
 *
 * Prefetching loads data into SWR's cache before the user navigates,
 * making the next page load feel instant. Call these on hover/focus
 * of navigation links to anticipate user intent.
 *
 * @example
 * ```tsx
 * <Link href="/projects" onMouseEnter={prefetchProjects}>
 *   Projects
 * </Link>
 * ```
 */

/**
 * Prefetch the projects list.
 * Use on sidebar navigation links or home page project links.
 */
export function prefetchProjects() {
  preload(SWR_KEYS.projects, swrFetcher)
}

/**
 * Prefetch the global studies list.
 * Uses the default query params from useAllStudies.
 */
export function prefetchAllStudies() {
  const params = new URLSearchParams({ limit: '50', offset: '0' }).toString()
  preload(SWR_KEYS.allStudies(params), swrFetcher)
}

/**
 * Prefetch dashboard statistics.
 * Use on dashboard navigation links.
 *
 * @param organizationId - Optional organization ID for multi-tenant filtering
 */
export function prefetchDashboard(organizationId?: string | null) {
  preload(SWR_KEYS.dashboard(organizationId), swrFetcher)
}

/**
 * Prefetch studies for a specific project.
 * Use on project card hover to preload the project's studies.
 *
 * Note: Uses swrFetcherUnwrap to match the fetcher used by useStudies hook.
 * This ensures the cached data format matches what the hook expects.
 *
 * @param projectId - The project ID to prefetch studies for
 */
export function prefetchProjectStudies(projectId: string) {
  // Prefetch first page of paginated studies (matches usePaginatedStudies key format)
  preload(`/api/projects/${projectId}/studies?limit=10`, swrFetcher)
}

/**
 * Prefetch a single project.
 * Use on project link hover.
 *
 * @param projectId - The project ID to prefetch
 */
export function prefetchProject(projectId: string) {
  preload(SWR_KEYS.project(projectId), swrFetcher)
}

/**
 * Prefetch a single study.
 * Use on study card/link hover.
 *
 * @param studyId - The study ID to prefetch
 */
export function prefetchStudy(studyId: string) {
  preload(SWR_KEYS.study(studyId), swrFetcher)
}

/**
 * Prefetch archived projects.
 * Use on archive navigation links.
 *
 * Note: Uses swrFetcherUnwrap to match the fetcher used by useArchivedProjects hook.
 * This ensures the cached data format matches what the hook expects.
 */
export function prefetchArchivedProjects() {
  preload(SWR_KEYS.archivedProjects, swrFetcherUnwrap)
}

/**
 * Prefetch archived studies.
 * Use on archive navigation links.
 *
 * Note: Uses swrFetcherUnwrap to match the fetcher used by useArchivedStudies hook.
 * This ensures the cached data format matches what the hook expects.
 */
export function prefetchArchivedStudies() {
  preload(SWR_KEYS.archivedStudies, swrFetcherUnwrap)
}

/**
 * React hook for prefetching on mouse enter.
 * Ensures prefetch only fires once per element to avoid redundant requests.
 *
 * @param prefetchFn - The prefetch function to call
 * @returns A memoized event handler for onMouseEnter
 *
 * @example
 * ```tsx
 * function ProjectCard({ project }) {
 *   const handlePrefetch = usePrefetchOnce(() => prefetchProjectStudies(project.id))
 *
 *   return (
 *     <Link
 *       href={`/projects/${project.id}`}
 *       onMouseEnter={handlePrefetch}
 *     >
 *       {project.name}
 *     </Link>
 *   )
 * }
 * ```
 */
export function usePrefetchOnce(prefetchFn: () => void) {
  let prefetched = false

  return () => {
    if (!prefetched) {
      prefetched = true
      prefetchFn()
    }
  }
}

/**
 * Create a prefetch handler that can be reused across components.
 * Unlike usePrefetchOnce, this creates a new handler each call.
 *
 * @param prefetchFn - The prefetch function to call
 * @returns An event handler for onMouseEnter
 *
 * @example
 * ```tsx
 * <Link onMouseEnter={createPrefetchHandler(prefetchProjects)}>
 *   Projects
 * </Link>
 * ```
 */
export function createPrefetchHandler(prefetchFn: () => void) {
  let prefetched = false

  return () => {
    if (!prefetched) {
      prefetched = true
      prefetchFn()
    }
  }
}
