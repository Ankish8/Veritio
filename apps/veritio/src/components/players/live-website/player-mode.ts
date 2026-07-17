import type { LiveWebsiteSettings } from './types'

/**
 * Companion mode requires either the reverse proxy (which injects the companion)
 * or a snippet that has actually connected. Unverified snippet studies fall back
 * to Veritio's floating task panel so participants never lose the task details.
 */
export function shouldUseCompanionController(settings: LiveWebsiteSettings): boolean {
  return settings.mode === 'reverse_proxy'
    || (settings.mode === 'snippet' && settings.snippetVerified === true)
}
