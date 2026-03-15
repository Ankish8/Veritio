'use client'

import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sparkles, Plus, ChevronDown, MessageSquare, Loader2, RotateCcw, X } from 'lucide-react'
import { useAssistantChat } from '@/hooks/use-assistant-chat'
import { useAssistantConversations } from '@/hooks/use-assistant-conversations'
import { useComposioStatus } from '@/hooks/use-composio-status'
import { useAssistantPendingEvents } from '@/hooks/use-assistant-pending-events'
import { useAuthFetch } from '@/hooks/use-auth-fetch'
import { MessageBubble } from './message-bubbles'
import { ChatInput } from './chat-input'
import { SuggestionChips, getSuggestions } from './suggestion-chips'
import { IntegrationBar } from './integration-bar'
import { PendingEventCards } from './pending-event-cards'

export interface AssistantPanelProps {
  studyId?: string
  studyType?: string
  mode?: 'results' | 'builder' | 'dashboard' | 'projects'
  onClose: () => void
  isPanelOpen?: boolean
  context?: { mode: string; studyId?: string; studyType?: string; projectId?: string }
  activeTab?: string
  activeFlowSection?: string
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function AssistantPanel({ studyId: studyIdProp, studyType: studyTypeProp, mode: modeProp, onClose: _onClose, isPanelOpen = true, context, activeTab, activeFlowSection }: AssistantPanelProps) {
  const studyId = studyIdProp ?? context?.studyId ?? ''
  const studyType = studyTypeProp ?? context?.studyType ?? ''
  const mode = (modeProp ?? context?.mode ?? 'results') as 'results' | 'builder'

  // Build-with-AI content mode: stores the study type (e.g. 'card_sort') when
  // the user clicks "Build with AI" from a content tab, or null for normal chat.
  const [buildContentMode, setBuildContentMode] = useState<string | null>(null)

  // When the AI modifies study data in builder mode, dispatch a custom event
  // so the builder page can re-fetch and reload stores without a full page reload.
  const chatOptions = useMemo(() => ({
    onDataChanged: mode === 'builder'
      ? (sections: string[], data?: Record<string, unknown>) => {
          window.dispatchEvent(new CustomEvent('builder:ai-data-changed', { detail: { sections, data } }))
        }
      : undefined,
    activeTab: mode === 'builder' ? activeTab : undefined,
    activeFlowSection: mode === 'builder' && activeTab === 'study-flow' ? activeFlowSection : undefined,
    endpoint: buildContentMode
      ? `/api/assistant/build-${buildContentMode.replace('_', '-')}`
      : undefined,
  }), [mode, activeTab, activeFlowSection, buildContentMode])

  const {
    messages,
    isStreaming,
    isLoadingConversation,
    sendMessage,
    loadConversation,
    newChat,
    clearChat,
    stopStreaming,
    conversationId,
    rateLimitInfo,
  } = useAssistantChat(studyId, mode, chatOptions)

  const { conversations, deleteConversation, deleteAllConversations, mutate: refreshConversations } = useAssistantConversations(studyId, mode)

  const {
    isConfigured,
    connections,
    isConnected,
    connect,
    disconnect,
  } = useComposioStatus()

  const { pendingEvents, dismissEvent, dismissPendingEvents } = useAssistantPendingEvents(isPanelOpen)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(false)
  const prevConversationIdRef = useRef<string | null>(null)

  // When a new conversation is created (conversationId goes from null to a value),
  // revalidate conversations list after a short delay to pick up the async-generated title
  useEffect(() => {
    const prev = prevConversationIdRef.current
    prevConversationIdRef.current = conversationId

    if (prev === null && conversationId !== null) {
      // New conversation created — wait for title generation then refresh list
      const timer = setTimeout(() => {
        refreshConversations()
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [conversationId, refreshConversations])

  // Listen for "Build with AI" content builder events from the builder panels
  useEffect(() => {
    const BUILD_MESSAGES: Record<string, string> = {
      card_sort: 'Help me build my card sort content',
      tree_test: 'Help me build my tree test navigation structure',
      survey: 'Help me build my survey questions',
      prototype_test: 'Help me set up my prototype test tasks',
      first_click: 'Help me build my first-click test tasks',
      first_impression: 'Help me build my first impression designs',
    }
    const handleBuildContent = (e: CustomEvent) => {
      const studyType = e.detail?.studyType
      if (!studyType) return
      newChat()
      setBuildContentMode(studyType)
      // Auto-send trigger message after a tick to let newChat() clear state
      setTimeout(() => {
        sendMessage(BUILD_MESSAGES[studyType] ?? `Help me build my ${studyType.replace(/_/g, ' ')} study`)
      }, 100)
    }
    window.addEventListener('ai-assistant-build-content', handleBuildContent as EventListener)
    return () => window.removeEventListener('ai-assistant-build-content', handleBuildContent as EventListener)
  }, [newChat, sendMessage])

  // Listen for generative UI "continue" actions (e.g. DraftStudyDetails confirm button)
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const msg = e.detail?.message
      if (typeof msg === 'string' && msg) sendMessage(msg)
    }
    window.addEventListener('assistant:send-message', handler as EventListener)
    return () => window.removeEventListener('assistant:send-message', handler as EventListener)
  }, [sendMessage])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (!autoScroll) return
    const el = scrollRef.current
    if (el) {
      // Slight delay to ensure DOM update
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
    }
  }, [messages, autoScroll])

  // Detect user scroll to disable auto-scroll, re-enable when near bottom
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    setAutoScroll(isNearBottom)
  }, [])

  // Wrapper for newChat that also resets build-content mode
  const handleNewChat = useCallback(() => {
    setBuildContentMode(null)
    newChat()
  }, [newChat])

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      deleteConversation(id)
      if (id === conversationId) handleNewChat()
    },
    [deleteConversation, conversationId, handleNewChat]
  )

  const handleDeleteAll = useCallback(() => {
    deleteAllConversations()
    handleNewChat()
  }, [deleteAllConversations, handleNewChat])

  const handleClearChat = useCallback(() => {
    clearChat()
    refreshConversations()
  }, [clearChat, refreshConversations])

  const connectedIntegrations = useMemo(
    () => connections.filter((c) => c.connected).map((c) => ({ toolkit: c.toolkit, name: c.name, logo: c.logo })),
    [connections]
  )

  // Extract context for suggestions API
  const suggestionContext = useMemo(
    () => ({
      mode,
      studyType,
      activeTab: mode === 'builder' ? activeTab : undefined,
      activeFlowSection: mode === 'builder' && activeTab === 'study-flow' ? activeFlowSection : undefined,
      connectedToolkits: connectedIntegrations.map((c) => c.toolkit),
    }),
    [mode, studyType, activeTab, activeFlowSection, connectedIntegrations]
  )

  // AI-generated suggestions state
  const authFetch = useAuthFetch()
  const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null)
  const [aiIntegrationSuggestions, setAiIntegrationSuggestions] = useState<{ toolkit: string; label: string }[] | null>(null)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false)

  // Reset AI suggestions when context changes
  useEffect(() => {
    setAiSuggestions(null)  
    setAiIntegrationSuggestions(null)  
  }, [studyType, mode, activeTab, activeFlowSection])

  // Stable key for integration suggestions (only changes when connected toolkits change)
  const connectedToolkitKey = connectedIntegrations.map((c) => c.toolkit).sort().join(',')

  // Auto-fetch AI integration suggestions when integrations connect/disconnect
  useEffect(() => {
    setAiIntegrationSuggestions(null)  
    if (connectedIntegrations.length === 0) return

    let cancelled = false
    setIsLoadingIntegrations(true)  

    authFetch('/api/assistant/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(suggestionContext),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.integrationSuggestions)) {
          setAiIntegrationSuggestions(data.integrationSuggestions)
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoadingIntegrations(false) })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on stable toolkit key
  }, [connectedToolkitKey])

  const handleRefreshSuggestions = useCallback(async () => {
    setIsLoadingSuggestions(true)
    try {
      const res = await authFetch('/api/assistant/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...suggestionContext, exclude: aiSuggestions ?? [] }),
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          setAiSuggestions(data.suggestions)
        }
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoadingSuggestions(false)
    }
  }, [authFetch, suggestionContext, aiSuggestions])

  const handleRefreshIntegrations = useCallback(async () => {
    setIsLoadingIntegrations(true)
    try {
      const res = await authFetch('/api/assistant/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...suggestionContext,
          exclude: aiIntegrationSuggestions?.map((s) => s.label) ?? []
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.integrationSuggestions)) {
          setAiIntegrationSuggestions(data.integrationSuggestions)
        }
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoadingIntegrations(false)
    }
  }, [authFetch, suggestionContext, aiIntegrationSuggestions])

  const isEmpty = messages.length === 0 && !isLoadingConversation

  // Find quick-reply suggestions from the last visible assistant message
  const quickReplies = useMemo(() => {
    if (isStreaming) return null
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.metadata?.type === 'tool_progress') continue
      if (msg.metadata?.type === 'component') continue
      // Check suggestions BEFORE skipping empty text — message_complete may set suggestions
      // even when text_delta raced and content is empty (WS delivery race after component render)
      if (msg.role === 'assistant' && msg.metadata?.suggestions) {
        return msg.metadata.suggestions
      }
      if (msg.role === 'assistant' && msg.metadata?.type === 'text' && !msg.content) continue
      break
    }
    return null
  }, [messages, isStreaming])

  return (
    <div className="flex h-full flex-col">
      {/* Chat animations — iMessage-style slide up */}
      <style>{`
        @keyframes msg-slide {
          0% { opacity: 0; transform: translateY(12px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes msg-fade {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .msg-anim-left { animation: msg-slide 0.25s cubic-bezier(0.25, 0.1, 0.25, 1) both; }
        .msg-anim-right { animation: msg-slide 0.25s cubic-bezier(0.25, 0.1, 0.25, 1) both; }
        .msg-anim-fade { animation: msg-fade 0.2s cubic-bezier(0.25, 0.1, 0.25, 1) both; }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 flex-shrink-0">
        <span className="text-sm font-semibold text-foreground">Veritio AI</span>
        <div className="flex items-center gap-1">
          {conversations.length > 0 && (
            <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2">
                  <MessageSquare className="h-3 w-3" />
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={8} className="w-72 p-0">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground">Chat history</span>
                  <button
                    type="button"
                    onClick={() => { handleDeleteAll(); setHistoryOpen(false) }}
                    className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {conversations.map((conv) => {
                    const isActive = conv.id === conversationId
                    return (
                      <div
                        key={conv.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => { loadConversation(conv.id); setHistoryOpen(false) }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { loadConversation(conv.id); setHistoryOpen(false) } }}
                        className={`group flex items-start gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-accent/60'
                            : 'hover:bg-accent/40'
                        }`}
                      >
                        <MessageSquare className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${isActive ? 'text-foreground' : 'text-muted-foreground/60'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] leading-snug truncate ${isActive ? 'font-medium text-foreground' : 'text-foreground/80'}`}>
                            {conv.title ?? 'Untitled conversation'}
                          </p>
                          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                            {formatRelativeTime(conv.updatedAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, conv.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 -mr-1 rounded-md hover:bg-destructive/10 transition-all shrink-0 mt-0.5"
                          title="Delete conversation"
                        >
                          <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}
          {!isEmpty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
              className="h-7 text-xs px-2"
              title="Clear chat"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewChat}
            className="h-7 text-xs px-2 gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            New chat
          </Button>
        </div>
      </div>

      {/* Pending event notification cards */}
      <PendingEventCards
        events={pendingEvents}
        onDismiss={dismissEvent}
        onDismissAll={dismissPendingEvents}
        onAskAI={(prompt) => sendMessage(prompt)}
      />

      {/* Message area */}
      <div className="flex-1 min-h-0 relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto"
        >
            {isLoadingConversation ? (
              <div className="flex items-center justify-center pt-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : isEmpty ? (
              <div className="flex flex-col h-full msg-anim-fade">
                {/* Hero greeting */}
                <div className="relative overflow-hidden rounded-xl mx-4 mt-4 mb-5 px-5 py-6 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border border-primary/10">
                  <Sparkles className="h-5 w-5 text-primary mb-3" />
                  <h3 className="text-base font-semibold text-foreground leading-tight mb-1">
                    {mode === 'builder' ? 'What can I help with?' : 'Explore your results'}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {mode === 'builder'
                      ? 'Ask anything or pick a suggestion below.'
                      : 'Ask a question or start with a suggestion.'}
                  </p>
                </div>
                {/* Suggestions */}
                <div className="px-4">
                  <SuggestionChips
                    studyType={studyType}
                    mode={mode}
                    connectedIntegrations={connectedIntegrations}
                    onSelect={sendMessage}
                    activeTab={activeTab}
                    activeFlowSection={activeFlowSection}
                    aiSuggestions={aiSuggestions}
                    aiIntegrationSuggestions={aiIntegrationSuggestions}
                    isLoadingSuggestions={isLoadingSuggestions}
                    isLoadingIntegrations={isLoadingIntegrations}
                    onRefreshSuggestions={handleRefreshSuggestions}
                    onRefreshIntegrations={handleRefreshIntegrations}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-4" key={conversationId}>
                {messages
                  .filter((msg) => {
                    // Hide empty placeholder bubbles (LLM responded with tool calls only, no text)
                    if (msg.role === 'assistant' && msg.metadata?.type === 'text' && !msg.content) return false
                    return true
                  })
                  .map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    onConnectIntegration={connect}
                    conversationId={conversationId}
                  />
                ))}
                {quickReplies && (
                  <div className="flex flex-wrap gap-1.5 msg-anim-fade">
                    {quickReplies.map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => sendMessage(label)}
                        className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 hover:border-primary/30 transition-colors cursor-pointer"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                {isStreaming && (
                  <div className="flex justify-start msg-anim-fade">
                    <div className="flex gap-1 px-3 py-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
      </div>

      {/* Integration bar */}
      <IntegrationBar
        isConfigured={isConfigured}
        connections={connections}
        isConnected={isConnected}
        onConnect={connect}
        onDisconnect={disconnect}
      />

      {/* Chat input */}
      <ChatInput
        onSend={sendMessage}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        rateLimitInfo={rateLimitInfo}
        mode={mode}
        placeholderSuggestions={isEmpty ? getSuggestions(studyType, mode, activeTab, activeFlowSection) : undefined}
        studyId={studyId}
      />
    </div>
  )
}

