'use client'

import { useRef, useEffect, useCallback, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Sparkles, Loader2, ExternalLink, Plus, MessageSquare, Home, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { formatDistanceToNow } from 'date-fns'
import { flushAllPendingState } from '@/components/generative-ui/flush-registry'
import { useAssistantChat } from '@/hooks/use-assistant-chat'
import type { StudyCreatedInfo } from '@/hooks/use-assistant-chat'
import { useAuthFetch } from '@/hooks/use-auth-fetch'
import { useComposioStatus } from '@/hooks/use-composio-status'
import { useCurrentOrganizationId } from '@/stores/collaboration-store'
import { MessageBubble } from '@/components/analysis/shared/assistant/message-bubbles'
import { ChatInput } from '@/components/analysis/shared/assistant/chat-input'
import { IntegrationBar } from '@/components/analysis/shared/assistant/integration-bar'

interface RecentConversation {
  id: string
  title: string | null
  updatedAt: string
}

function CreateWithAIContent() {
  const searchParams = useSearchParams()
  const _router = useRouter()
  const initialPrompt = searchParams.get('prompt')
  const initialConversationId = searchParams.get('conversationId')
  const preSelectedProjectId = searchParams.get('projectId') || undefined
  const preSelectedProjectName = searchParams.get('projectName') || undefined
  const preSelectedStudyType = searchParams.get('studyType') || undefined
  const paramMode = searchParams.get('mode') as 'create' | 'results' | null
  const paramStudyId = searchParams.get('studyId') || undefined
  const paramStudyName = searchParams.get('studyName') || undefined
  const currentOrganizationId = useCurrentOrganizationId()
  const hasSentInitialRef = useRef(false)
  const hasLoadedConversationRef = useRef(false)
  const [createdStudy, setCreatedStudy] = useState<StudyCreatedInfo | null>(null)
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([])
  const [isLoadingRecent, setIsLoadingRecent] = useState(false)
  const [isSavingFlow, setIsSavingFlow] = useState(false)
  const authFetch = useAuthFetch()

  // Support both create and results (analyze) modes via URL params
  const chatMode = paramMode === 'results' ? 'results' : 'create'
  const chatStudyId = chatMode === 'results' ? paramStudyId : undefined

  // Breadcrumb state — populated from URL params, study creation, or conversation loading
  const [breadcrumb, setBreadcrumb] = useState<{
    projectId?: string
    projectName?: string
    studyId?: string
    studyName?: string
  }>({
    projectId: preSelectedProjectId,
    projectName: preSelectedProjectName,
    studyId: paramStudyId,
    studyName: paramStudyName,
  })

  const handleStudyCreated = useCallback((info: StudyCreatedInfo) => {
    setCreatedStudy(info)
    setBreadcrumb((prev) => ({
      ...prev,
      studyId: info.studyId,
      studyName: info.studyName,
      projectId: prev.projectId || info.projectId,
    }))
  }, [])

  // When a conversation is loaded, fetch study/project info for breadcrumbs
  const handleConversationLoaded = useCallback(
    async (studyId: string | null) => {
      if (!studyId) return
      // Already have info from URL params
      if (breadcrumb.studyName && breadcrumb.projectName) return
      try {
        const res = await authFetch(`/api/studies/${studyId}`)
        if (!res.ok) return
        const study = await res.json()
        const projectId = study.project_id
        let projectName = breadcrumb.projectName
        if (projectId && !projectName) {
          const projRes = await authFetch(`/api/projects/${projectId}`)
          if (projRes.ok) {
            const project = await projRes.json()
            projectName = project.name
          }
        }
        setBreadcrumb({
          projectId,
          projectName,
          studyId,
          studyName: study.title,
        })
      } catch {
        // Non-critical — breadcrumb will just show less info
      }
    },
    [authFetch, breadcrumb.studyName, breadcrumb.projectName]
  )

  const {
    messages,
    isStreaming,
    sendMessage,
    stopStreaming,
    loadConversation,
    newChat,
    rateLimitInfo,
    conversationId,
  } = useAssistantChat(chatStudyId, chatMode, {
    onStudyCreated: handleStudyCreated,
    onConversationLoaded: handleConversationLoaded,
    preSelectedProjectId,
    preSelectedProjectName,
    preSelectedStudyType,
    organizationId: currentOrganizationId ?? undefined,
    skipAutoRestore: !!initialPrompt,
  })

  const hasMessages = messages.length > 0

  // Fetch recent conversations when in empty state
  const fetchRecentConversations = useCallback(async () => {
    setIsLoadingRecent(true)
    try {
      const res = await authFetch(`/api/assistant/conversations?mode=${chatMode}`)
      if (res.ok) {
        const data = await res.json()
        setRecentConversations((data.conversations ?? []).slice(0, 5))
      }
    } catch {
      // Silently ignore — non-critical
    } finally {
      setIsLoadingRecent(false)
    }
  }, [authFetch, chatMode])

  useEffect(() => {
    if (!hasMessages && !initialPrompt) {
      fetchRecentConversations()
    }
  }, [hasMessages, initialPrompt, fetchRecentConversations])

  const handleNewChat = useCallback(() => {
    newChat()
    setCreatedStudy(null)
    setBreadcrumb({
      projectId: preSelectedProjectId,
      projectName: preSelectedProjectName,
    })
    fetchRecentConversations()
  }, [newChat, fetchRecentConversations, preSelectedProjectId, preSelectedProjectName])

  const handleLoadConversation = useCallback(
    (id: string) => {
      loadConversation(id)
      setCreatedStudy(null)
    },
    [loadConversation]
  )

  /** Flush any pending non-flow component state, then open builder */
  const saveFlowConfig = useCallback(async (openBuilder = false) => {
    if (!conversationId) return
    // Open about:blank synchronously (in click handler call-stack) so popup
    // blockers don't block it. We'll navigate to the real URL after save.
    let newTab: Window | null = null
    if (openBuilder && createdStudy?.builderUrl) {
      newTab = window.open('about:blank', '_blank')
      if (newTab) {
        try {
          newTab.document.title = 'Opening builder…'
          newTab.document.body.innerHTML =
            '<p style="font-family:system-ui;color:#888;padding:2rem;text-align:center">Opening builder…</p>'
        } catch {
          // cross-origin write may fail in some browsers — tab still works
        }
      }
    }
    setIsSavingFlow(true)
    try {
      // Flush any pending debounced component state (non-flow components)
      await flushAllPendingState()
      // Flow tools now write directly to DB — no Motia state save needed
      // Navigate the pre-opened tab to builder
      if (newTab && createdStudy?.builderUrl) {
        const fullUrl = createdStudy.builderUrl.startsWith('http')
          ? createdStudy.builderUrl
          : `${window.location.origin}${createdStudy.builderUrl}`
        newTab.location.href = fullUrl
      }
      if (!openBuilder) {
        toast.success('Configuration saved')
      }
    } catch {
      toast.error('Failed to open builder')
      newTab?.close()
    } finally {
      setIsSavingFlow(false)
    }
  }, [conversationId, createdStudy?.builderUrl])

  const {
    isConfigured,
    connections,
    isConnected,
    connect,
    disconnect,
  } = useComposioStatus()

  // Auto-scroll
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (!autoScroll) return
    const el = scrollRef.current
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
    }
  }, [messages, autoScroll])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    setAutoScroll(isNearBottom)
  }, [])

  // Auto-send initial prompt from URL params
  useEffect(() => {
    if (initialPrompt && !hasSentInitialRef.current && !isStreaming) {
      hasSentInitialRef.current = true
      setTimeout(() => sendMessage(initialPrompt), 300)
    }
  }, [initialPrompt, isStreaming, sendMessage])

  // Auto-load conversation from URL params (when navigating from dashboard)
  useEffect(() => {
    if (initialConversationId && !hasLoadedConversationRef.current) {
      hasLoadedConversationRef.current = true
      loadConversation(initialConversationId)
    }
  }, [initialConversationId, loadConversation])

  // Quick replies extraction
  const lastVisibleMessages = messages.filter((msg) => {
    if (msg.metadata?.type === 'tool_progress') return false
    if (msg.metadata?.type === 'component') return false
    // Keep messages that have suggestions even if content is empty (WS race: text_delta
    // may arrive after message_complete is ignored, leaving placeholder with empty content)
    if (msg.role === 'assistant' && msg.metadata?.suggestions) return true
    if (msg.role === 'assistant' && msg.metadata?.type === 'text' && !msg.content) return false
    return true
  })
  const lastMsg = lastVisibleMessages[lastVisibleMessages.length - 1]
  const quickReplies =
    !isStreaming && lastMsg?.role === 'assistant' && lastMsg.metadata?.suggestions
      ? (lastMsg.metadata.suggestions as string[])
      : null

  return (
    <div className="flex flex-col h-full">
      <style>{`
        @keyframes msg-left {
          0% { opacity: 0; transform: translateY(12px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes msg-right {
          0% { opacity: 0; transform: translateY(12px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes msg-fade {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .msg-anim-left { animation: msg-left 0.25s cubic-bezier(0.25, 0.1, 0.25, 1) both; }
        .msg-anim-right { animation: msg-right 0.25s cubic-bezier(0.25, 0.1, 0.25, 1) both; }
        .msg-anim-fade { animation: msg-fade 0.2s cubic-bezier(0.25, 0.1, 0.25, 1) both; }
      `}</style>

      {/* Header — breadcrumb navigation */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <nav className="flex items-center gap-1.5 text-sm min-w-0">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <Home className="h-4 w-4" />
          </Link>
          {breadcrumb.projectName && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              {breadcrumb.projectId ? (
                <Link
                  href={`/projects/${breadcrumb.projectId}`}
                  className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[200px]"
                >
                  {breadcrumb.projectName}
                </Link>
              ) : (
                <span className="text-muted-foreground truncate max-w-[200px]">{breadcrumb.projectName}</span>
              )}
            </>
          )}
          {breadcrumb.studyName && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              {breadcrumb.studyId && breadcrumb.projectId ? (
                <Link
                  href={chatMode === 'results'
                    ? `/projects/${breadcrumb.projectId}/studies/${breadcrumb.studyId}/results`
                    : createdStudy?.builderUrl ?? `/projects/${breadcrumb.projectId}/studies/${breadcrumb.studyId}`
                  }
                  className="text-foreground font-medium truncate max-w-[200px]"
                >
                  {breadcrumb.studyName}
                </Link>
              ) : (
                <span className="text-foreground font-medium truncate max-w-[200px]">{breadcrumb.studyName}</span>
              )}
            </>
          )}
          {!breadcrumb.projectName && !breadcrumb.studyName && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              <span className="text-foreground font-medium">
                {chatMode === 'results' ? 'Analyze' : 'Create'}
              </span>
            </>
          )}
        </nav>
        <div className="flex items-center gap-3">
          {hasMessages && (
            <button
              type="button"
              onClick={handleNewChat}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              New chat
            </button>
          )}
          {createdStudy && (
            <Button size="sm" onClick={() => saveFlowConfig(true)} disabled={isSavingFlow}>
              {isSavingFlow ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              {isSavingFlow ? 'Saving...' : 'Open in Builder'}
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable message area */}
      <div className="flex-1 min-h-0 overflow-y-auto" ref={scrollRef} onScroll={handleScroll}>
        <div className="mx-auto max-w-2xl px-4 py-6">
          {/* Welcome card */}
          <div className="flex justify-end mb-6">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {chatMode === 'results' ? 'Analyze with AI' : 'Create using AI'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {chatMode === 'results'
                    ? 'Ask questions about your study data and get insights'
                    : 'Describe your goal and get a ready-to-run study'}
                </div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            </div>
          </div>

          {/* Recent conversations — shown in empty state */}
          {!hasMessages && !initialPrompt && recentConversations.length > 0 && (
            <div className="mb-6">
              <div className="text-xs text-muted-foreground/60 mb-2">Recent conversations</div>
              <div className="space-y-1">
                {recentConversations.map((conv) => (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => handleLoadConversation(conv.id)}
                    className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors group"
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
                    <span className="truncate flex-1">{conv.title || 'Untitled conversation'}</span>
                    <span className="text-xs text-muted-foreground/40 shrink-0">
                      {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {!hasMessages && !initialPrompt && isLoadingRecent && (
            <div className="flex justify-center mb-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
            </div>
          )}

          {/* Messages */}
          {messages
            .filter((msg) => {
              if (msg.role === 'assistant' && msg.metadata?.type === 'text' && !msg.content)
                return false
              return true
            })
            .map((msg) => (
              <div key={msg.id} className="mb-3">
                <MessageBubble message={msg} onConnectIntegration={connect} conversationId={conversationId} />
              </div>
            ))}

          {/* Quick replies */}
          {quickReplies && (
            <div className="flex flex-wrap gap-1.5 mb-3 msg-anim-fade">
              {quickReplies.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (label === 'Open in Builder') {
                      saveFlowConfig(true)
                    } else {
                      sendMessage(label)
                    }
                  }}
                  disabled={label === 'Open in Builder' && isSavingFlow}
                  className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted hover:border-foreground/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {label === 'Open in Builder' && isSavingFlow ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                      Saving…
                    </>
                  ) : label === 'Open in Builder' ? (
                    <>
                      <Check className="h-3 w-3 mr-1.5" />
                      {label}
                    </>
                  ) : (
                    label
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Typing indicator */}
          {isStreaming && (
            <div className="flex justify-start mb-3 msg-anim-fade">
              <div className="flex gap-1 px-3 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom section: integration bar + input */}
      <div className="mx-auto w-full max-w-2xl px-4 pb-4 flex-shrink-0">
        <IntegrationBar
          isConfigured={isConfigured}
          connections={connections}
          isConnected={isConnected}
          onConnect={connect}
          onDisconnect={disconnect}
        />
        <ChatInput
          onSend={sendMessage}
          onStop={stopStreaming}
          isStreaming={isStreaming}
          rateLimitInfo={rateLimitInfo}
          mode="builder"
        />
      </div>
    </div>
  )
}

export function CreateWithAIClient() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CreateWithAIContent />
    </Suspense>
  )
}
