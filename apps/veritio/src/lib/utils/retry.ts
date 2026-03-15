/**
 * Retry utility with exponential backoff for network requests
 *
 * Provides automatic retry capability for failed API calls with:
 * - Configurable max attempts
 * - Exponential backoff with jitter
 * - Intelligent retry decisions based on error type
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number
  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelayMs?: number
  /** Maximum delay cap in milliseconds (default: 10000) */
  maxDelayMs?: number
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number
  /** Custom function to determine if error should trigger retry */
  shouldRetry?: (error: Error, attempt: number) => boolean
  /** Callback fired before each retry attempt */
  onRetry?: (error: Error, attempt: number, delayMs: number) => void
}

/**
 * Default retry decision logic:
 * - NEVER retry: Validation errors (400, 422), auth errors (401, 403), not found (404)
 * - ALWAYS retry: Network errors, server errors (5xx), rate limit (429)
 * - Auto-save specific: Stale data errors (STALE_DATA_ABORT) are never retried
 */
function defaultShouldRetry(error: Error): boolean {
  // Auto-save stale data detection - never retry
  if (error.message === 'STALE_DATA_ABORT') {
    return false
  }

  // Network errors (no response received) - always retry
  if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('timeout')) {
    return true
  }

  // Extract HTTP status from error
  let status: number | undefined

  // Check for status in error message (e.g., "HTTP error: status 500")
  const statusMatch = error.message.match(/status[:\s]+(\d{3})/i)
  if (statusMatch) {
    status = parseInt(statusMatch[1], 10)
  }

  // Check for status property on error object
  if (status === undefined) {
    status = (error as Error & { status?: number }).status
  }

  // If we have a status code, apply retry logic
  if (status !== undefined) {
    // NEVER retry client errors (except 429 rate limit)
    if (status === 400) return false // Bad request (validation errors)
    if (status === 401) return false // Unauthorized (session expired)
    if (status === 403) return false // Forbidden (permission denied)
    if (status === 404) return false // Not found
    if (status === 422) return false // Unprocessable entity (validation)

    // ALWAYS retry rate limits
    if (status === 429) return true

    // ALWAYS retry server errors
    if (status >= 500) return true

    // Other 4xx errors - don't retry
    if (status >= 400 && status < 500) return false
  }

  // Default: don't retry unknown errors (conservative approach)
  return false
}

/**
 * Add jitter to delay to prevent thundering herd
 */
function addJitter(delay: number): number {
  // Add up to 20% random jitter
  const jitter = delay * 0.2 * Math.random()
  return Math.floor(delay + jitter)
}

/**
 * Wraps an async function with retry logic and exponential backoff
 *
 * @example
 * ```typescript
 * // Basic usage
 * const data = await withRetry(() => fetch('/api/data'))
 *
 * // With custom options
 * const data = await withRetry(
 *   () => authFetch('/api/studies/123/cards', { method: 'PUT' }),
 *   {
 *     maxAttempts: 5,
 *     initialDelayMs: 500,
 *     onRetry: (err, attempt, delay) => {
 *       console.log(`Retry ${attempt} in ${delay}ms: ${err.message}`)
 *     }
 *   }
 * )
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options

  let lastError: Error
  let delay = initialDelayMs

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if we should retry
      const isLastAttempt = attempt === maxAttempts
      const canRetry = shouldRetry(lastError, attempt)

      if (isLastAttempt || !canRetry) {
        throw lastError
      }

      // Calculate delay with jitter
      const actualDelay = addJitter(Math.min(delay, maxDelayMs))

      // Notify about retry
      if (onRetry) {
        onRetry(lastError, attempt, actualDelay)
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, actualDelay))

      // Increase delay for next attempt
      delay = delay * backoffMultiplier
    }
  }

  // TypeScript: this is unreachable but satisfies the compiler
  throw lastError!
}

/**
 * Converts HTTP 5xx responses into thrown errors so `withRetry` can retry them.
 *
 * By default, `fetch()` resolves successfully even on 5xx responses — it only
 * throws on network errors. This means `withRetry(() => fetch(...))` silently
 * returns 500 responses without retrying. Wrapping with this helper bridges the
 * gap: `withRetry(() => fetch(...).then(throwOnServerError))`.
 *
 * The thrown error message includes the status code so `defaultShouldRetry`
 * correctly identifies it as retryable.
 */
export function throwOnServerError(response: Response): Response {
  if (response.status >= 500) {
    throw Object.assign(
      new Error(`Server error: status ${response.status}`),
      { status: response.status }
    )
  }
  return response
}

/**
 * Wraps a fetch Response check with retry-friendly error throwing
 * Use this to convert non-ok responses into errors that can trigger retries
 *
 * @example
 * ```typescript
 * const response = await withRetry(async () => {
 *   const res = await fetch('/api/data')
 *   return throwIfNotOk(res)
 * })
 * ```
 */
export async function throwIfNotOk(response: Response): Promise<Response> {
  if (!response.ok) {
    const error = new Error(`HTTP error: status ${response.status}`) as Error & { status: number }
    error.status = response.status
    throw error
  }
  return response
}
