/**
 * SWR Infrastructure Module
 *
 * This module provides centralized SWR configuration, fetchers, and utilities
 * for the entire application. It eliminates the need for each hook to define
 * its own fetcher and configuration.
 *
 * Key exports:
 * - swrConfig: Global SWR configuration with retry logic, deduplication, etc.
 * - swrFetcher: Authenticated fetcher with timeout and error handling
 * - publicFetcher: Unauthenticated fetcher for participant pages
 * - SWR_KEYS: Centralized cache key constants
 * - Prefetch utilities for anticipatory data loading
 *
 * @example
 * ```tsx
 * // In SWRProvider (root layout)
 * import { swrConfig, swrFetcher } from './index'
 * <SWRConfig value={{ ...swrConfig, fetcher: swrFetcher }}>
 *
 * // In hooks (simplified)
 * import { SWR_KEYS } from './index'
 * const { data } = useSWR(SWR_KEYS.projects) // Uses global fetcher
 *
 * // For prefetching
 * import { prefetchProjectStudies } from './index'
 * <Link onMouseEnter={() => prefetchProjectStudies(id)}>
 * ```
 */

// Configuration
export { swrConfig, SWR_KEYS, FetchError } from './config'

// Fetchers
export {
  swrFetcher,
  publicFetcher,
  swrFetcherUnwrap,
  getAuthFetchInstance,
} from './fetcher'

// Prefetching utilities
export {
  prefetchIfFast,
  prefetchProjects,
  prefetchAllStudies,
  prefetchDashboard,
  prefetchProjectStudies,
  prefetchProject,
  prefetchStudy,
  prefetchArchivedProjects,
  prefetchArchivedStudies,
  usePrefetchOnce,
  createPrefetchHandler,
} from './prefetch'
