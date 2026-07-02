/**
 * Canonical resolver for the outbound email "from" identity.
 *
 * Single source of truth: EMAIL_FROM, in Resend's "Name <address>" format
 * (e.g. `Veritio <noreply@veritio.io>`). Every outbound-email path resolves
 * its sender through this so there is exactly one thing to configure.
 *
 * NOTE: `@veritio/auth` is a standalone package and cannot import this module,
 * so it mirrors the same EMAIL_FROM + default there. Keep the default in sync.
 */
export const DEFAULT_FROM_EMAIL = 'Veritio <noreply@veritio.io>'

export function resolveFromEmail(): string {
  return process.env.EMAIL_FROM || DEFAULT_FROM_EMAIL
}
