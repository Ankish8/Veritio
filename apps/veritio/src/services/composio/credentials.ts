/**
 * Tracks whether Composio has rejected our API key.
 *
 * A *present but invalid* key is worse than a missing one. Callers gate on
 * `isComposioConfigured()`, which only checked that the variable was set, so an
 * invalid key passed the guard, the request went out, Composio answered 401, and
 * the surrounding try/catch turned it into a silent no-op. Users with a
 * connected integration saw nothing happen and nothing explaining why.
 *
 * Once a 401 is observed, treat the integration as unconfigured so the existing
 * guards skip it cleanly, and say so in the logs exactly once.
 */

let authRejected = false
let loggedRejection = false

/** True once Composio has rejected our credentials this process. */
export function isComposioAuthRejected(): boolean {
  return authRejected
}

/** Test seam; also useful after rotating the key in a long-lived process. */
export function resetComposioCredentialState(): void {
  authRejected = false
  loggedRejection = false
}

function statusOf(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined
  const candidate = err as Record<string, unknown>
  for (const key of ['status', 'statusCode', 'code']) {
    const value = candidate[key]
    if (typeof value === 'number') return value
  }
  return undefined
}

/**
 * Whether an error means "our API key is not acceptable" as opposed to a
 * transient or request-specific failure.
 *
 * Deliberately narrow. A 403 or a 429 must not latch the integration off, since
 * those are per-request or per-quota conditions rather than a bad key.
 */
export function isComposioAuthError(err: unknown): boolean {
  if (!err) return false

  if (err instanceof Error && err.name === 'AuthenticationError') return true
  if (statusOf(err) === 401) return true

  const message = err instanceof Error ? err.message : String(err)
  return (
    /invalid api key/i.test(message) ||
    /APIKey_InvalidAPIKey/i.test(message) ||
    /\b401\b/.test(message)
  )
}

/**
 * Records a Composio failure, latching the integration off if the credentials
 * were rejected. Safe to call with any error; non-auth errors are ignored.
 */
export function noteComposioError(err: unknown): void {
  if (!isComposioAuthError(err)) return

  authRejected = true
  if (loggedRejection) return
  loggedRejection = true

  console.error(
    JSON.stringify({
      event: 'composio.credentials_rejected',
      message:
        'Composio rejected COMPOSIO_API_KEY. Integration features are disabled until the key is rotated. Unset COMPOSIO_API_KEY to skip them explicitly.',
      detail: err instanceof Error ? err.message : String(err),
    }),
  )
}

/**
 * Records the error, then returns a message for the caller to surface.
 *
 * Replaces bare message formatting in the service's catch blocks so a rejected
 * key can never pass by unnoticed.
 */
export function describeComposioError(err: unknown): string {
  noteComposioError(err)
  if (isComposioAuthError(err)) {
    return 'Composio rejected the configured API key (COMPOSIO_API_KEY)'
  }
  return err instanceof Error ? err.message : 'Unknown error'
}
