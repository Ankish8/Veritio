/**
 * Veritio AI -- LLM error classification
 *
 * Turns raw provider/SDK errors (OpenAI-compatible) into clear, actionable,
 * secret-free messages for end users. NEVER surfaces API key fragments, provider
 * URLs, or stack traces in the UI -- the raw error is logged server-side instead.
 *
 * Safe to show in both production and development.
 */

const SETTINGS_HINT = 'Settings > AI Models'

export interface LlmErrorContext {
  /** True when the failing request used the user's own key (Settings > AI Models). */
  usingUserKey?: boolean
  /** True when a platform/admin/env key is configured (even if it turned out invalid). */
  hasPlatformKey?: boolean
}

function statusOf(err: unknown): number | undefined {
  const s = (err as { status?: unknown } | null)?.status
  return typeof s === 'number' ? s : undefined
}

/**
 * Classify an LLM/provider error into a user-facing message.
 * Contains no secrets, so it is safe to return in any environment.
 */
export function classifyLlmError(err: unknown, ctx: LlmErrorContext = {}): string {
  const status = statusOf(err)
  const message = (err instanceof Error ? err.message : String(err)) || ''
  const usingUserKey = ctx.usingUserKey ?? false
  const hasKey = usingUserKey || (ctx.hasPlatformKey ?? false)

  // No key configured anywhere -- the model genuinely "isn't there" yet.
  if (/api[_ ]?key is not set/i.test(message) || !hasKey) {
    return `Veritio AI isn't set up yet. Add an AI provider API key in ${SETTINGS_HINT} to start using it.`
  }

  // 401 -- the key exists but the provider rejected it.
  if (status === 401 || /incorrect api key|invalid api key|invalid_api_key|unauthorized|authentication/i.test(message)) {
    return usingUserKey
      ? `Your AI provider rejected the API key. Double-check the key in ${SETTINGS_HINT}.`
      : `Veritio AI is unavailable right now: the API key was rejected by the provider. You can add your own key in ${SETTINGS_HINT} to continue.`
  }

  // 403 -- key valid but not allowed (model/endpoint not permitted).
  if (status === 403) {
    return `The AI provider denied access to the configured model. Check your plan or pick another model in ${SETTINGS_HINT}.`
  }

  // 404 -- model not found or not accessible.
  if (status === 404 || /model.*(not found|does not exist)|does not have access to model|no such model/i.test(message)) {
    return `The selected AI model isn't available. Choose a different model in ${SETTINGS_HINT}.`
  }

  // 429 -- rate limit or quota.
  if (status === 429 || /rate limit|insufficient_quota|exceeded your current quota|\bquota\b/i.test(message)) {
    return usingUserKey
      ? `Your AI provider's rate limit or quota was reached. Wait a moment, or check your provider account.`
      : `Veritio AI is busy right now. Please try again in a moment.`
  }

  // Timeouts / dropped connections.
  if (/timed out|timeout|etimedout|econnreset|econnrefused/i.test(message)) {
    return `The AI took too long to respond. Please try again.`
  }

  // 400 -- malformed request, often a bad base URL or model id on a custom endpoint.
  if (status === 400) {
    return usingUserKey
      ? `The AI provider rejected the request. Check the model name and base URL in ${SETTINGS_HINT}.`
      : `Failed to get an AI response. Please try again.`
  }

  // 5xx -- provider outage.
  if (status !== undefined && status >= 500) {
    return `The AI provider is having trouble right now. Please try again in a moment.`
  }

  return `Failed to get an AI response. Please try again.`
}
