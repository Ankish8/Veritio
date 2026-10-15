'use client'

import { useUserPreferences } from './use-user-preferences'

/**
 * Whether the signed-in user saved their own OpenAI key. OpenAI features are
 * bring-your-own-key; Mercury features work for everyone. While preferences
 * load, `isLoading` is true and callers should not show the disabled state yet.
 */
export function useHasOpenAiKey(): { hasKey: boolean; isLoading: boolean } {
  const { preferences, isLoading } = useUserPreferences()
  return { hasKey: !!preferences?.ai?.openai?.hasApiKey, isLoading }
}
