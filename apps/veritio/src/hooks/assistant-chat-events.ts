import type {
  AssistantMessage,
  SSEEvent,
  MessageMetadata,
  RateLimitInfo,
} from '@/services/assistant/types'
import { stripSuggestionMarkers } from '@/services/assistant/types'
import { parse as parsePartialJson } from 'partial-json'

/** Module-level cache so chat state survives panel close/open (unmount/remount). */
export const chatStateCache = new Map<string, { conversationId: string; messages: AssistantMessage[] }>()

/** Find an existing component message by componentId, or create a new one */
function updateOrCreateComponentMessage(
  prev: AssistantMessage[],
  componentId: string,
  updates: Partial<MessageMetadata>,
): AssistantMessage[] {
  const idx = prev.findIndex(
    (m) => m.metadata?.type === 'component' && m.metadata?.componentId === componentId,
  )
  if (idx !== -1) {
    const updated = [...prev]
    updated[idx] = {
      ...updated[idx],
      metadata: { ...updated[idx].metadata!, ...updates } as MessageMetadata,
    }
    return updated
  }
  // Create new component message
  return [
    ...prev,
    {
      id: crypto.randomUUID(),
      conversationId: '',
      role: 'assistant' as const,
      content: null,
      metadata: { type: 'component' as const, componentId, ...updates } as MessageMetadata,
      createdAt: new Date().toISOString(),
    },
  ]
}

export interface StudyCreatedInfo {
  studyId: string
  studyName?: string
  studyType: string
  projectId: string
  builderUrl: string
}

export interface UseAssistantChatOptions {
  /** Called when the AI modifies study data via write tools. Sections indicate what changed. */
  onDataChanged?: (sections: string[], data?: Record<string, unknown>) => void
  /** Called when a study is created in create mode (Phase 2 transition). */
  onStudyCreated?: (info: StudyCreatedInfo) => void
  /** Called when a conversation is loaded, providing its associated studyId (if any). */
  onConversationLoaded?: (studyId: string | null) => void
  /** Pre-selected project from dashboard dropdown (create mode only) */
  preSelectedProjectId?: string
  preSelectedProjectName?: string
  /** Pre-selected study type from dashboard dropdown (create mode only) */
  preSelectedStudyType?: string
  /** Current organization ID — scopes project listing to this org */
  organizationId?: string
  /** Active builder tab (builder mode only) — injected into system prompt */
  activeTab?: string
  /** Active flow section within the study-flow tab (builder mode only) */
  activeFlowSection?: string
  /** Override API endpoint (default: '/api/assistant/chat') */
  endpoint?: string
  /** If true, skip auto-restoring the last conversation. Use when starting fresh via a URL prompt. */
  skipAutoRestore?: boolean
}

/**
 * Apply a single SSE event to the message state.
 * Returns true if the event signals stream completion (message_complete / error / rate_limit).
 */
export function applyEvent(
  event: SSEEvent,
  assistantMsgId: string,
  setMessages: React.Dispatch<React.SetStateAction<AssistantMessage[]>>,
  setConversationId: React.Dispatch<React.SetStateAction<string | null>>,
  setRateLimitInfo: React.Dispatch<React.SetStateAction<RateLimitInfo | null>>,
  onDataChanged?: (sections: string[], data?: Record<string, unknown>) => void,
  onStudyCreated?: (info: StudyCreatedInfo) => void,
): boolean {
  switch (event.type) {
    case 'text_delta':
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: (m.content ?? '') + event.content }
            : m
        )
      )
      return false

    case 'text_replace':
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: event.content }
            : m
        )
      )
      return false

    case 'tool_start':
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          conversationId: '',
          role: 'assistant',
          content: event.description ?? `Running ${event.toolName}...`,
          metadata: { type: 'tool_progress', toolName: event.toolName, status: 'running' },
          createdAt: new Date().toISOString(),
        },
      ])
      return false

    case 'tool_done':
      setMessages((prev) => {
        // Find the last matching tool_progress message and mark it done
        let idx = -1
        for (let i = prev.length - 1; i >= 0; i--) {
          const m = prev[i]
          if (m.metadata?.type === 'tool_progress' && m.metadata?.toolName === event.toolName && m.metadata?.status === 'running') {
            idx = i
            break
          }
        }
        if (idx === -1) return prev
        const updated = [...prev]
        updated[idx] = {
          ...updated[idx],
          metadata: { ...updated[idx].metadata!, status: 'done' } as MessageMetadata,
        }
        return updated
      })
      return false

    case 'connect_required':
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          conversationId: '',
          role: 'assistant',
          content: `Please connect your ${event.toolkit} account to continue.`,
          metadata: { type: 'connect_prompt', toolkit: event.toolkit },
          createdAt: new Date().toISOString(),
        },
      ])
      return false

    case 'message_complete': {
      const hasSuggestions = event.metadata?.suggestions
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantMsgId) return m
          // Use event.content as fallback when content is empty (HTTP fallback path — WS missed text_delta events)
          const rawContent = m.content || event.content || ''
          return {
            ...m,
            id: event.messageId,
            conversationId: event.conversationId,
            content: hasSuggestions ? stripSuggestionMarkers(rawContent) : rawContent,
            ...(event.metadata ? { metadata: { ...m.metadata, ...event.metadata } as MessageMetadata } : {}),
          }
        })
      )
      setConversationId(event.conversationId)
      return true
    }

    case 'error':
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: event.message, metadata: { type: 'error' } }
            : m
        )
      )
      return true

    case 'rate_limit':
      setRateLimitInfo(event.info)
      return true

    case 'study_data_changed':
      onDataChanged?.(event.sections, event.data)
      return false

    case 'study_created':
      onStudyCreated?.({
        studyId: event.studyId,
        studyName: event.studyTitle,
        studyType: event.studyType,
        projectId: event.projectId,
        builderUrl: event.builderUrl,
      })
      return false

    case 'component_props_delta': {
      // Parse incomplete JSON from streaming tool call args
      let partialProps: Record<string, unknown> = {}
      try {
        partialProps = parsePartialJson(event.partialArgs) ?? {}
      } catch {
        // Incomplete JSON not yet parseable — skip this delta
        return false
      }
      if (typeof partialProps !== 'object' || partialProps === null) return false

      const propStatus = Object.fromEntries(
        Object.keys(partialProps).map((k) => [k, 'streaming' as const]),
      )

      setMessages((prev) =>
        updateOrCreateComponentMessage(prev, event.componentId, {
          componentName: event.componentName,
          componentProps: partialProps,
          componentPropStatus: propStatus,
          componentStreamingDone: false,
        }),
      )
      return false
    }

    case 'component_render': {
      const allComplete = Object.fromEntries(
        Object.keys(event.props).map((k) => [k, 'complete' as const]),
      )

      setMessages((prev) =>
        updateOrCreateComponentMessage(prev, event.componentId, {
          componentName: event.componentName,
          componentProps: event.props,
          componentPropStatus: allComplete,
          componentStreamingDone: true,
        }),
      )
      return false
    }

    default:
      return false
  }
}
