'use client'

import { useCallback, type ComponentType } from 'react'
import { useAuthFetch } from '@/hooks/use-auth-fetch'

/**
 * HOC that wraps a generative component with onStateChange wired to the
 * component-state API. When the user edits props in an interactable component,
 * the updated state is stored in the conversation so the next LLM turn sees it.
 */
export function withInteractable<T extends Record<string, unknown>>(
  Component: ComponentType<T & { onStateChange?: (state: T) => void }>,
  componentId: string,
  componentName: string,
  conversationId: string,
) {
  return function InteractableWrapper(props: T) {
    const authFetch = useAuthFetch()

    const handleStateChange = useCallback(
      async (newState: T) => {
        await authFetch('/api/assistant/component-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            componentId,
            componentName,
            state: newState,
          }),
        }).catch(() => {
          // Silently fail — component still works, just won't sync back to LLM
        })
      },
      [authFetch],
    )

    return <Component {...props} onStateChange={handleStateChange} />
  }
}
