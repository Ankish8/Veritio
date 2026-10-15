/**
 * Copy and links for bring-your-own-key OpenAI, shared by the backend gate
 * (services/assistant/byok.ts) and the UI that disables OpenAI features.
 */

export const OPENAI_KEY_SETTINGS_HREF = '/settings?tab=ai-models'

export const OPENAI_KEY_REQUIRED_MESSAGE =
  'This AI feature runs on OpenAI with your own API key. Add your OpenAI key in Settings > AI Models to turn it on.'

/** Short form for tooltips. */
export const OPENAI_KEY_REQUIRED_TOOLTIP = 'Uses your own OpenAI key. Add one in Settings > AI Models to turn this on.'
