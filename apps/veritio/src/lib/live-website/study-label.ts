/**
 * `live_website_test` backs two products in the study picker — "Website
 * Prototype Test" (Auto Mode / reverse proxy, no code) and "Web App Test"
 * (Snippet Mode, script installed on the researcher's own domain). Both write
 * the same `study_type`, so every list, table and info panel used to label them
 * "Web App Test" regardless of which one was created.
 *
 * The product is recoverable from settings: `createdFromUseCase` records the
 * card that was clicked, and `mode` reflects what the study actually does now
 * (which wins when the researcher switches mode in the builder).
 */

export const WEBSITE_PROTOTYPE_TEST_LABEL = 'Website Prototype Test'
export const WEB_APP_TEST_LABEL = 'Web App Test'

/**
 * Which of the two products a live website study is. Call sites map this to
 * their own icon so the picker's AppWindow/Globe distinction survives into
 * lists, tables and info panels.
 */
export type LiveWebsiteStudyVariant = 'website_prototype' | 'web_app'

interface LiveWebsiteLabelSettings {
  mode?: unknown
  createdFromUseCase?: unknown
}

/**
 * `mode` is authoritative because a researcher can switch it after creation;
 * `createdFromUseCase` is the fallback for studies saved before a mode was
 * persisted, and for Observer Mode, which belongs to neither product.
 */
export function getLiveWebsiteStudyVariant(settings: unknown): LiveWebsiteStudyVariant {
  const values = (settings && typeof settings === 'object' ? settings : {}) as LiveWebsiteLabelSettings

  if (values.mode === 'reverse_proxy') return 'website_prototype'
  if (values.mode === 'snippet') return 'web_app'
  if (values.createdFromUseCase === 'website_prototype_test') return 'website_prototype'

  return 'web_app'
}

/** Label for a `live_website_test` study. */
export function getLiveWebsiteStudyLabel(settings: unknown): string {
  return getLiveWebsiteStudyVariant(settings) === 'website_prototype'
    ? WEBSITE_PROTOTYPE_TEST_LABEL
    : WEB_APP_TEST_LABEL
}

/**
 * Display label for any study type. Non-live-website types are unaffected;
 * callers pass their existing label as `fallbackLabel`.
 */
export function getStudyDisplayLabel(
  studyType: string,
  fallbackLabel: string,
  settings?: unknown
): string {
  return studyType === 'live_website_test' ? getLiveWebsiteStudyLabel(settings) : fallbackLabel
}
