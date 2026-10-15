/**
 * OpenAI is bring-your-own-key (BYOK).
 *
 * Mercury runs on the platform key for everyone. Every OpenAI-backed feature
 * (assistant chat, AI builders, suggestions, insights reports, live-website
 * event analysis) runs only on the requesting user's own OpenAI key, saved in
 * Settings > AI Models. The platform OpenAI key is never used for users.
 */

import type { UserAiOverrides } from '../user-ai-config-service'
import { OPENAI_KEY_REQUIRED_MESSAGE } from '../../lib/ai/byok'

export const OPENAI_KEY_REQUIRED_CODE = 'openai_key_required'

export { OPENAI_KEY_REQUIRED_MESSAGE }

export class OpenAiKeyRequiredError extends Error {
  readonly code = OPENAI_KEY_REQUIRED_CODE
  readonly status = 403
  constructor() {
    super(OPENAI_KEY_REQUIRED_MESSAGE)
    this.name = 'OpenAiKeyRequiredError'
  }
}

export function hasOwnOpenAiKey(overrides: UserAiOverrides | null | undefined): boolean {
  return !!overrides?.openai.apiKey?.trim()
}

/** The 403 an OpenAI-backed endpoint returns when the user has no key of their own. */
export function openAiKeyRequiredResponse() {
  return {
    status: 403,
    body: { error: OPENAI_KEY_REQUIRED_MESSAGE, code: OPENAI_KEY_REQUIRED_CODE },
  } as const
}
