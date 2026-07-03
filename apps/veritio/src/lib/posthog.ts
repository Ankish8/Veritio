import { PostHog } from 'posthog-node'

let _client: PostHog | null = null

/**
 * Returns a shared PostHog client, or `null` when analytics is not configured
 * (no `POSTHOG_API_KEY`). Callers should use optional chaining:
 *
 *   getPostHogClient()?.capture({ ... })
 *
 * Returning null keeps analytics a no-op in local dev, CI, and tests instead
 * of spamming the ingestion endpoint with an empty token.
 */
export function getPostHogClient(): PostHog | null {
  if (!process.env.POSTHOG_API_KEY) return null

  if (!_client) {
    _client = new PostHog(process.env.POSTHOG_API_KEY, {
      host: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com',
      // Server-side exception autocapture ships every unhandled error (with
      // whatever is in the message) to PostHog and registers global process
      // handlers. Opt in deliberately if you want that; off by default.
      enableExceptionAutocapture: false,
    })

    // Flush buffered events on shutdown so a deploy/restart (e.g. Railway)
    // does not drop events still sitting in the batch queue.
    process.once('SIGTERM', () => {
      void _client?.shutdown()
    })
    process.once('SIGINT', () => {
      void _client?.shutdown()
    })
  }

  return _client
}
