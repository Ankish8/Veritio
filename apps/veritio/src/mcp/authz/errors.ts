/**
 * Agent-facing errors.
 *
 * MCP draws a hard line: anything the model could plausibly fix is a *tool
 * execution error* (`isError: true` in a normal result) so the model can
 * self-correct. Only unknown-tool / malformed-request / server-fault are
 * JSON-RPC errors. Everything in this file is the former.
 *
 * Messages are written for a model, not a log reader: say what was wrong and
 * what to do instead. Never leak whether a resource exists to a caller who
 * cannot see it.
 */

export type ToolErrorCode =
  | 'invalid_input'
  | 'insufficient_scope'
  | 'permission_denied'
  | 'not_found'
  | 'plan_required'
  | 'rate_limited'
  | 'conflict'
  | 'upstream_error'

export class ToolError extends Error {
  readonly code: ToolErrorCode
  /** Optional next step for the model, appended to the message. */
  readonly hint?: string
  /**
   * HTTP status the REST API should answer with, when the code alone is too
   * coarse. MCP ignores this — it has no status codes — but `permission_denied`
   * covers two genuinely different HTTP answers: 404 for a resource the caller
   * cannot see at all, and 403 for one they can see but lack the role on.
   * Collapsing both to one status would either leak existence or misreport a
   * fixable role problem as a missing resource.
   */
  readonly httpStatus?: number

  constructor(code: ToolErrorCode, message: string, hint?: string, httpStatus?: number) {
    super(message)
    this.name = 'ToolError'
    this.code = code
    this.hint = hint
    this.httpStatus = httpStatus
  }

  /** The text the model actually sees. */
  toAgentMessage(): string {
    return this.hint ? `${this.message} ${this.hint}` : this.message
  }
}

export const invalidInput = (message: string, hint?: string) => new ToolError('invalid_input', message, hint)

export const insufficientScope = (required: string) =>
  new ToolError(
    'insufficient_scope',
    `This credential is missing the "${required}" scope.`,
    'Ask the user to re-issue their Veritio API key with this scope, or reconnect via OAuth granting it.',
    403,
  )

/**
 * Permission and not-found collapse into one shape on purpose.
 *
 * A caller who cannot see a study must not be able to tell "does not exist"
 * from "exists but is not yours" — that difference is an enumeration oracle
 * over every study id in the system.
 */
export const noAccess = (resource: string) =>
  new ToolError(
    'permission_denied',
    `No ${resource} was found for that id, or you do not have access to it.`,
    'Check the id, or use search to find resources you can access.',
    404,
  )

export const needsRole = (action: string, requiredRole: string, userRole: string | null) =>
  new ToolError(
    'permission_denied',
    userRole
      ? `Cannot ${action}: this requires the "${requiredRole}" role and you have "${userRole}".`
      : `Cannot ${action}: you are not a member of the organization that owns this resource.`,
    'Ask an organization admin to raise your role.',
    403,
  )

export const planRequired = (feature: string, detail?: string) =>
  new ToolError(
    'plan_required',
    detail ?? `The "${feature}" feature is not available on this workspace's plan.`,
    'Read-only tools still work. Ask the user to upgrade to enable this.',
    402,
  )

export const rateLimited = (retryAfterSeconds: number) =>
  new ToolError(
    'rate_limited',
    `Rate limit reached. Retry in ${retryAfterSeconds}s.`,
    'Batch your changes into fewer calls, or reduce how much you request at once.',
    429,
  )
