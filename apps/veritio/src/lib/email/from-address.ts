/**
 * Canonical resolver for the outbound email "from" identity.
 *
 * Single source of truth: EMAIL_FROM, in Resend's "Name <address>" format
 * (e.g. `Veritio <noreply@veritio.io>`). Every outbound-email path should
 * resolve its sender through this so there is exactly one thing to configure.
 *
 * EMAIL_FROM_ADDRESS (bare address) is the deprecated app-side var, honored
 * only as a fallback so existing deployments keep working. Prefer EMAIL_FROM.
 *
 * NOTE: `@veritio/auth` is a standalone package and cannot import this module,
 * so it mirrors the same EMAIL_FROM + default there. Keep the default in sync.
 */
export const DEFAULT_FROM_EMAIL = 'Veritio <noreply@veritio.io>'

export function resolveFromEmail(): string {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM
  const legacy = process.env.EMAIL_FROM_ADDRESS
  if (legacy) return `Veritio <${legacy}>`
  return DEFAULT_FROM_EMAIL
}
