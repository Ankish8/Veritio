'use client'

import type { AssistantMessage } from '@/services/assistant/types'

/**
 * Extract per-prop streaming status from a generative UI component message.
 */
export function useGenerativePropStatus(message: AssistantMessage) {
  return {
    propStatus: message.metadata?.componentPropStatus ?? {},
    isStreaming: !message.metadata?.componentStreamingDone,
    isComplete: !!message.metadata?.componentStreamingDone,
  }
}
