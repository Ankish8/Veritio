'use client'

import { memo, useCallback } from 'react'
import type { AssistantMessage } from '@/services/assistant/types'
import { useGenerativePropStatus } from '@/hooks/use-generative-prop-status'
import { useAuthFetch } from '@/hooks/use-auth-fetch'
import { trackSave } from './flush-registry'
import { GenerativeComponent } from './generative-component'

/** Flow components — rendered as read-only previews. Changes go through text conversation → AI tools → DB directly. */
const FLOW_COMPONENTS = new Set(['DraftFlowSection', 'DraftParticipantId', 'DraftFlowQuestions'])

/**
 * Chat bubble wrapper for a generative UI component.
 * Renders the component inside a left-aligned assistant bubble with
 * optional "Generating..." indicator while props are still streaming.
 */
export const GenerativeComponentBubble = memo(function GenerativeComponentBubble({
  message,
  conversationId,
}: {
  message: AssistantMessage
  conversationId: string | null
}) {
  const { propStatus, isStreaming } = useGenerativePropStatus(message)
  const authFetch = useAuthFetch()

  const componentName = message.metadata?.componentName
  const componentId = message.metadata?.componentId ?? ''

  const handleStateChange = useCallback(
    (newState: Record<string, unknown>) => {
      if (!conversationId || !componentName) return
      const promise = authFetch('/api/assistant/component-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          componentId,
          componentName,
          state: newState,
        }),
      }).catch(() => {})
      trackSave(promise)
    },
    [authFetch, conversationId, componentId, componentName],
  )

  if (!componentName) return null

  return (
    <div className="flex justify-start msg-anim-left">
      <div className="w-full max-w-[92%] rounded-2xl rounded-bl-sm bg-muted/50 border border-border/60 overflow-hidden">
        <GenerativeComponent
          componentName={componentName}
          props={message.metadata?.componentProps ?? {}}
          propStatus={propStatus}
          componentId={componentId}
          interactable={FLOW_COMPONENTS.has(componentName) ? false : message.metadata?.interactable}
          onStateChange={handleStateChange}
        />
        {isStreaming && (
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground/50 border-t border-border/30">
            Generating...
          </div>
        )}
      </div>
    </div>
  )
})
