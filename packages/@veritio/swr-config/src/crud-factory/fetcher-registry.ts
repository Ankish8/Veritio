/**
 * Fetcher Registry for CRUD Hook Factory
 *
 * Allows apps to register their fetcher functions once,
 * which the CRUD factory then uses for mutations and SWR fetching.
 * This avoids the package depending on app-specific auth/error code.
 */

export interface CRUDFetcherRegistry {
  /** Authenticated fetch instance for mutations */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAuthFetch: () => (url: string, options?: any) => Promise<Response>
  /** SWR fetcher that unwraps { data: T } responses */
  swrFetcherUnwrap: <T>(url: string) => Promise<T>
  /** Public (unauthenticated) SWR fetcher */
  publicFetcher: <T>(url: string) => Promise<T>
}

let registry: CRUDFetcherRegistry | null = null

/**
 * Register fetcher functions for the CRUD hook factory.
 * Must be called once during app initialization (e.g., in a provider or layout).
 */
export function registerCRUDFetchers(fetchers: CRUDFetcherRegistry): void {
  registry = fetchers
}

/**
 * Get the registered fetcher registry.
 * Throws if not registered — apps must call registerCRUDFetchers() first.
 */
export function getCRUDFetcherRegistry(): CRUDFetcherRegistry {
  if (!registry) {
    throw new Error(
      'CRUD fetcher registry not initialized. Call registerCRUDFetchers() during app startup.'
    )
  }
  return registry
}
