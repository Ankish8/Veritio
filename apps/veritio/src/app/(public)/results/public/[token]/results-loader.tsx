'use client'

import dynamic from 'next/dynamic'

/**
 * Lazy wrapper for PublicResultsClient — ensures the heavy analysis bundles
 * (card sort, tree test, survey, prototype test, etc.) are only downloaded
 * when actually rendering results, NOT for the password gate or error screens.
 *
 * SSR is enabled so HTML streams immediately from the server Suspense boundary.
 * The per-study-type dynamic imports inside PublicResultsClient handle
 * code-splitting — only the active study type's chunks are downloaded.
 */
const LazyPublicResultsClient = dynamic(
  () => import('./public-results-client').then((m) => ({ default: m.PublicResultsClient })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-16">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    ),
  }
)

export { LazyPublicResultsClient }
