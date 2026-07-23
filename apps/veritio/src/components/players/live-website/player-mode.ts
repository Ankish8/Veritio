import type { LiveWebsiteSettings } from './types'
import {
  hasValidLiveWebsiteTrackingConfiguration,
  isValidLiveWebsiteSnippetId,
} from '@/lib/live-website/snippet-id'

const TRACKING_CONFIGURATION_ERROR =
  'This study is not configured correctly for website tracking. Please contact the researcher and try again after they repair the study.'

export function getLiveWebsiteConfigurationError(
  settings: LiveWebsiteSettings
): string | null {
  return hasValidLiveWebsiteTrackingConfiguration(settings)
    ? null
    : TRACKING_CONFIGURATION_ERROR
}

/**
 * Companion mode requires either the reverse proxy (which injects the companion)
 * or a snippet that has actually connected. Unverified snippet studies fall back
 * to Veritio's floating task panel so participants never lose the task details.
 */
export function shouldUseCompanionController(settings: LiveWebsiteSettings): boolean {
  return (settings.mode === 'reverse_proxy' && isValidLiveWebsiteSnippetId(settings.snippetId))
    || (
      settings.mode === 'snippet'
      && isValidLiveWebsiteSnippetId(settings.snippetId)
      && settings.snippetVerified === true
    )
}
