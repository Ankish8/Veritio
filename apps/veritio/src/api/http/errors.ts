/**
 * The public API's error model: RFC 9457 Problem Details.
 *
 * One shape for every failure, so a client can write one error handler and be
 * done. `code` is the stable, machine-readable discriminator — branch on that,
 * never on `title` or `status` alone.
 *
 * The vocabulary is deliberately shared with the MCP server (`mcp/authz/errors`).
 * Both surfaces sit on the same authorization core, so an agent that hits
 * `insufficient_scope` over MCP and a script that hits it over HTTP are being
 * told the same thing in the same words.
 */

import { ToolError, type ToolErrorCode } from "@/mcp/authz/errors";

export const PROBLEM_CONTENT_TYPE = "application/problem+json";

/** Where `type` URIs point. Each anchor is a section in the API reference. */
const ERROR_DOCS = "https://veritio.io/docs/api/errors";

export interface FieldIssue {
  /** Dotted path to the offending field, e.g. `settings.mode` or `items.0.label`. */
  path: string;
  message: string;
}

/** The JSON body of every non-2xx response. */
export interface ProblemDocument {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: ApiErrorCode;
  request_id: string;
  /** Present on 400s produced by schema validation. */
  errors?: FieldIssue[];
  /** Present on 429. Seconds until the caller may retry. */
  retry_after?: number;
  /** Present on 402. The plan feature that would unlock the call. */
  feature?: string;
}

/**
 * Every code the API can return.
 *
 * A superset of `ToolErrorCode`: the extra members are transport-level
 * conditions MCP has no equivalent for (an MCP client cannot send a malformed
 * URL or an unsupported method).
 */
export type ApiErrorCode =
  | ToolErrorCode
  | "unauthorized"
  | "not_acceptable"
  | "unsupported_media_type"
  | "payload_too_large"
  | "method_not_allowed"
  | "idempotency_conflict"
  | "internal_error";

const TITLES: Record<ApiErrorCode, string> = {
  invalid_input: "Invalid request",
  insufficient_scope: "Insufficient scope",
  permission_denied: "Permission denied",
  not_found: "Not found",
  plan_required: "Plan upgrade required",
  rate_limited: "Rate limit exceeded",
  conflict: "Conflict",
  upstream_error: "Upstream error",
  unauthorized: "Unauthorized",
  not_acceptable: "Not acceptable",
  unsupported_media_type: "Unsupported media type",
  payload_too_large: "Payload too large",
  method_not_allowed: "Method not allowed",
  idempotency_conflict: "Idempotency key reused",
  internal_error: "Internal error",
};

/** Fallback status per code, used when the error carries no explicit one. */
const STATUSES: Record<ApiErrorCode, number> = {
  invalid_input: 400,
  insufficient_scope: 403,
  // Collapsed to 404 by default: a caller who cannot see a resource must not be
  // able to distinguish "does not exist" from "exists but is not yours", which
  // would be an enumeration oracle over every id in the system. `needsRole`
  // overrides this to 403, where existence is already known to the caller.
  permission_denied: 404,
  not_found: 404,
  plan_required: 402,
  rate_limited: 429,
  conflict: 409,
  upstream_error: 502,
  unauthorized: 401,
  not_acceptable: 406,
  unsupported_media_type: 415,
  payload_too_large: 413,
  method_not_allowed: 405,
  idempotency_conflict: 409,
  internal_error: 500,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly issues?: FieldIssue[];
  readonly retryAfter?: number;
  readonly feature?: string;
  /** Extra response headers this error requires, e.g. `WWW-Authenticate`. */
  readonly headers?: Record<string, string>;

  constructor(
    code: ApiErrorCode,
    detail: string,
    opts: {
      status?: number;
      issues?: FieldIssue[];
      retryAfter?: number;
      feature?: string;
      headers?: Record<string, string>;
    } = {},
  ) {
    super(detail);
    this.name = "ApiError";
    this.code = code;
    this.status = opts.status ?? STATUSES[code];
    this.issues = opts.issues;
    this.retryAfter = opts.retryAfter;
    this.feature = opts.feature;
    this.headers = opts.headers;
  }

  toProblem(requestId: string): ProblemDocument {
    return {
      type: `${ERROR_DOCS}#${this.code}`,
      title: TITLES[this.code],
      status: this.status,
      detail: this.message,
      code: this.code,
      request_id: requestId,
      ...(this.issues?.length ? { errors: this.issues } : {}),
      ...(this.retryAfter !== undefined ? { retry_after: this.retryAfter } : {}),
      ...(this.feature ? { feature: this.feature } : {}),
    };
  }
}

/**
 * Translate an error thrown by the shared authorization core or a service.
 *
 * `ToolError` already carries a code and, where the code alone is ambiguous, an
 * explicit HTTP status. Anything else is a server fault: it becomes a 500 with
 * a generic detail, because an unexpected message may carry internals or PII
 * and a caller can act on neither.
 */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (err instanceof ToolError) {
    return new ApiError(err.code, err.toAgentMessage(), {
      status: err.httpStatus,
    });
  }

  return new ApiError(
    "internal_error",
    "Veritio could not complete that request. This is a server-side problem, not a bad request.",
  );
}

// --- Constructors for the conditions the transport layer itself detects. ---

export const badRequest = (detail: string, issues?: FieldIssue[]) =>
  new ApiError("invalid_input", detail, { issues });

export const notFound = (detail: string) => new ApiError("not_found", detail);

export const methodNotAllowed = (allowed: readonly string[]) =>
  new ApiError(
    "method_not_allowed",
    `That method is not supported on this path. Allowed: ${allowed.join(", ")}.`,
    { headers: { Allow: allowed.join(", ") } },
  );

export const unsupportedMediaType = () =>
  new ApiError(
    "unsupported_media_type",
    "Request bodies must be sent as application/json.",
  );

export const payloadTooLarge = (limitBytes: number) =>
  new ApiError(
    "payload_too_large",
    `Request body exceeds the ${Math.round(limitBytes / 1024)} KB limit.`,
  );
