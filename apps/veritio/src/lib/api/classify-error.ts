import type { MotiaLogger } from '../motia/types'

export type ErrorResponse = { status: number; body: { error: string } }

type ErrorRule = {
  pattern: string
  status: number
  /** When provided, use this as the response message instead of error.message */
  message?: string
}

const DEFAULT_RULES: ErrorRule[] = [
  // 404 - Not Found (sanitized to avoid leaking DB-level details)
  { pattern: 'not found', status: 404, message: 'Resource not found' },
  { pattern: 'No rows', status: 404, message: 'Resource not found' },
  { pattern: 'no rows', status: 404, message: 'Resource not found' },
  { pattern: 'already deleted', status: 404, message: 'Resource not found' },

  // 403 - Forbidden
  { pattern: 'Permission denied', status: 403, message: 'Permission denied' },
  { pattern: 'Not authorized', status: 403, message: 'Not authorized' },
  { pattern: 'authorized', status: 403, message: 'Not authorized' },
  { pattern: 'Access denied', status: 403, message: 'Access denied' },
  { pattern: 'access denied', status: 403, message: 'Access denied' },
  { pattern: 'only author', status: 403, message: 'Permission denied' },
  { pattern: 'Only owners', status: 403, message: 'Permission denied' },
  { pattern: 'Cannot remove', status: 403, message: 'Permission denied' },
  { pattern: 'does not allow comments', status: 403, message: 'Comments not allowed' },

  // 409 - Conflict
  { pattern: 'already exists', status: 409, message: 'Resource already exists' },
  { pattern: 'already a member', status: 409, message: 'Already a member' },
  { pattern: 'already taken', status: 409, message: 'Already taken' },
  { pattern: 'duplicate', status: 409, message: 'Duplicate resource' },

  // 410 - Gone
  { pattern: 'expired', status: 410, message: 'Resource has expired' },
  { pattern: 'maximum uses', status: 410, message: 'Maximum uses reached' },
]

/**
 * Classify a service error into an HTTP error response.
 *
 * Handles both `{ data, error }` service results (where `error` is an Error)
 * and `catch (error)` blocks (where `error` is `unknown`).
 *
 * @param error - The error object (Error instance or unknown)
 * @param logger - Motia logger for recording the failure
 * @param context - Human-readable operation name (e.g. 'Create comment')
 * @param options.fallbackMessage - 500 body message (defaults to 'Internal server error')
 * @param options.extraRules - Additional rules checked before the defaults
 */
export function classifyError(
  error: unknown,
  logger: MotiaLogger,
  context: string,
  options?: {
    fallbackMessage?: string
    extraRules?: ErrorRule[]
  },
): ErrorResponse {
  const message = error instanceof Error ? error.message : 'Unknown error'
  logger.error(`${context} failed`, { error: message })

  const rules = options?.extraRules
    ? [...options.extraRules, ...DEFAULT_RULES]
    : DEFAULT_RULES

  for (const rule of rules) {
    if (message.includes(rule.pattern)) {
      return {
        status: rule.status,
        body: { error: rule.message ?? message },
      }
    }
  }

  return {
    status: 500,
    body: { error: options?.fallbackMessage ?? 'Internal server error' },
  }
}
