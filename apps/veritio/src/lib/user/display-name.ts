import type { DisplayNamePreference } from '../supabase/user-preferences-types'

/** The parts of a user's identity a display name can be derived from. */
export interface DisplayNameParts {
  name?: string | null
  email?: string | null
}

/**
 * Format a user's display name according to their {@link DisplayNamePreference}.
 *
 * This is the single source of truth for the "Display name format" setting
 * (Settings › Profile › Display Preferences). It is used both client-side
 * (how you see your own name) and server-side (how teammates see your name in
 * comments, mentions, presence, etc.) so the format stays consistent everywhere.
 *
 * Falls back gracefully when the preferred field is missing:
 *   - first_name  → first word of name, else the email local-part
 *   - email       → email, else name
 *   - full_name   → name, else the email local-part
 * Returns `fallback` (default "User") only when nothing usable exists.
 */
export function formatDisplayName(
  parts: DisplayNameParts,
  preference: DisplayNamePreference | null | undefined = 'full_name',
  fallback = 'User'
): string {
  const name = (parts.name ?? '').trim()
  const email = (parts.email ?? '').trim()
  const emailLocalPart = email.split('@')[0] ?? ''

  switch (preference) {
    case 'email':
      return email || name || fallback
    case 'first_name':
      return name.split(/\s+/).filter(Boolean)[0] || emailLocalPart || fallback
    case 'full_name':
    default:
      return name || emailLocalPart || fallback
  }
}
