import { isWwwVariantOrigin } from './proxy-url-rewrite'

/**
 * Whether a proxied origin belongs to the study that is being run.
 *
 * The proxy encodes its target origin in the URL path, and for most of its life
 * nothing checked that the origin had anything to do with the study, so the
 * worker would proxy any public site for anyone. This is the comparison half of
 * closing that: the worker collects a study's configured origins and asks this
 * whether the requested one is among them.
 *
 * Lives in the app so it is covered by the app's test suite (vitest only
 * collects src/**), matching proxy-url-rewrite.ts and origin-safety.ts.
 */

/** Studies reference their target in several columns; each may hold a full URL. */
export interface StudyOriginSources {
  /** studies.settings->>'websiteUrl' */
  websiteUrl?: string | null
  /** live_website_tasks.target_url / success_url */
  taskUrls?: (string | null | undefined)[]
  /** live_website_variants.url */
  variantUrls?: (string | null | undefined)[]
  /** live_website_task_variants.starting_url / success_url */
  taskVariantUrls?: (string | null | undefined)[]
}

/**
 * Reduces every configured URL to a set of origins.
 *
 * Values are stored as full URLs with paths ("https://myoperator.com/pricing"),
 * so they must be parsed rather than compared as strings. Anything unparseable
 * is skipped instead of throwing: one malformed row must not be able to lock a
 * researcher out of their own study.
 */
export function collectStudyOrigins(sources: StudyOriginSources): Set<string> {
  const origins = new Set<string>()

  const add = (value: string | null | undefined) => {
    if (!value) return
    try {
      const { origin } = new URL(value)
      if (origin && origin !== 'null') origins.add(origin)
    } catch {
      // Not a usable URL; ignore.
    }
  }

  add(sources.websiteUrl)
  for (const list of [
    sources.taskUrls,
    sources.variantUrls,
    sources.taskVariantUrls,
  ]) {
    for (const value of list ?? []) add(value)
  }

  return origins
}

/**
 * True when `requestedOrigin` is one of the study's configured origins, or the
 * apex/www counterpart of one.
 *
 * The www tolerance is required, not a convenience. The proxy rewrites an
 * apex -> www redirect and re-encodes the URL with the www origin, so a study
 * configured as "https://bbc.com" legitimately produces requests carrying
 * "https://www.bbc.com". Exact matching would make the worker reject its own
 * rewritten URLs.
 *
 * An empty origin set returns true: a study with nothing configured yet must not
 * be treated as an attack.
 */
export function isOriginAllowedForStudy(
  requestedOrigin: string,
  allowedOrigins: Set<string> | string[],
): boolean {
  const allowed = Array.isArray(allowedOrigins)
    ? allowedOrigins
    : [...allowedOrigins]
  if (allowed.length === 0) return true

  let requested: string
  try {
    requested = new URL(requestedOrigin).origin
  } catch {
    return false
  }

  for (const candidate of allowed) {
    if (candidate === requested) return true
    if (isWwwVariantOrigin(candidate, requested)) return true
  }

  return false
}
