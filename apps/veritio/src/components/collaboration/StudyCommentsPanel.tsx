'use client'

import { useCallback, useMemo, useRef, useEffect } from 'react'
import { format, isSameDay } from 'date-fns'
import { Loader2, MessageSquareText } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useStudyComments, type CommentThread } from '@/hooks/use-study-comments'
import { useOrganizationMembers } from '@/hooks/use-organizations'
import { useCurrentOrganizationId } from '@/stores/collaboration-store'
import { useSession } from '@veritio/auth/client'
import { toast } from '@/components/ui/sonner'

import { CommentInput, ThreadItem, DateSeparator } from './comments'

interface StudyCommentsPanelProps {
  studyId: string
  isConnected?: boolean
  connectionError?: string | null
  onReconnect?: () => void
  isReconnecting?: boolean
}

export function StudyCommentsPanel({
  studyId,
  isConnected = true,
  connectionError,
  onReconnect,
  isReconnecting,
}: StudyCommentsPanelProps) {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id

  const organizationId = useCurrentOrganizationId()
  const { members } = useOrganizationMembers(organizationId)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)
  const isInitialLoadRef = useRef(true)

  const {
    comments,
    threads,
    isLoading,
    error,
    createComment,
    updateComment,
    deleteComment,
    hasMore,
    isLoadingMore,
    loadMore,
    totalCount,
    retryFailedMessage,
    dismissFailedMessage,
  } = useStudyComments(studyId)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  useEffect(() => {
    if (!isLoading && comments.length > 0 && isInitialLoadRef.current) {
      scrollToBottom('instant' as ScrollBehavior)
      isInitialLoadRef.current = false
    }
  }, [isLoading, comments.length, scrollToBottom])

  useEffect(() => {
    if (comments.length > prevCountRef.current && !isInitialLoadRef.current) {
      const wasAtBottom = scrollContainerRef.current
        ? scrollContainerRef.current.scrollHeight - scrollContainerRef.current.scrollTop - scrollContainerRef.current.clientHeight < 100
        : true

      if (wasAtBottom) {
        scrollToBottom()
      }
    }
    prevCountRef.current = comments.length
  }, [comments.length, scrollToBottom])

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || isLoadingMore || !hasMore) return

    if (container.scrollTop < 100) {
      const scrollHeight = container.scrollHeight
      const scrollTop = container.scrollTop

      loadMore().then(() => {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            const newScrollHeight = scrollContainerRef.current.scrollHeight
            const heightDiff = newScrollHeight - scrollHeight
            scrollContainerRef.current.scrollTop = scrollTop + heightDiff
          }
        })
      })
    }
  }, [hasMore, isLoadingMore, loadMore])

  const groupedByDate = useMemo(() => {
    if (!threads.length) return []

    const groups: { label: string; date: Date; threads: CommentThread[] }[] = []
    let current: (typeof groups)[0] | null = null

    for (const thread of threads) {
      const date = new Date(thread.parent.created_at)

      if (!current || !isSameDay(current.date, date)) {
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        const label = isSameDay(date, today)
          ? 'Today'
          : isSameDay(date, yesterday)
            ? 'Yesterday'
            : format(date, 'EEEE, MMMM d')

        current = { date, label, threads: [] }
        groups.push(current)
      }
      current.threads.push(thread)
    }

    return groups
  }, [threads])

  const handleCreateComment = async (content: string) => {
    createComment(content).catch((err) => {
      toast.error('Failed to send message', {
        description: err instanceof Error ? err.message : 'Please try again',
      })
    })
    setTimeout(() => scrollToBottom(), 50)
  }

  const handleCreateReply = async (parentId: string, content: string) => {
    await createComment(content, parentId)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground flex-1">
            Discuss this study with your team. Comments are visible to all collaborators.
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {isConnected ? (
              <div className="flex items-center gap-1" title="Real-time sync active">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[12px] text-muted-foreground hidden sm:inline">Live</span>
              </div>
            ) : connectionError ? (
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                <span className="text-[12px] text-destructive">Offline</span>
                {onReconnect && (
                  <button
                    onClick={onReconnect}
                    disabled={isReconnecting}
                    className="text-[12px] text-primary underline hover:no-underline disabled:opacity-50"
                  >
                    {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1" title="Connecting...">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-[12px] text-muted-foreground">Connecting</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto px-4 py-3 space-y-3"
        >
          {isLoadingMore && (
            <div className="flex justify-center items-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-xs text-muted-foreground">Loading older messages...</span>
            </div>
          )}

          {hasMore && !isLoadingMore && threads.length > 0 && (
            <div className="flex justify-center py-2">
              <button
                onClick={() => loadMore()}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ↑ Scroll up or click to load older messages ({totalCount - comments.length} more)
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-destructive">Failed to load comments</p>
              <p className="text-xs text-muted-foreground mt-1">{String(error)}</p>
            </div>
          ) : threads.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquareText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No comments yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start a discussion about this study
              </p>
            </div>
          ) : (
            <>
              {groupedByDate.map((group) => (
                <div key={group.label}>
                  <DateSeparator label={group.label} />
                  <div className="space-y-1">
                    {group.threads.map((thread, idx) => {
                      const prevThread = idx > 0 ? group.threads[idx - 1] : null
                      const isSameAuthor = prevThread?.parent.author_user_id === thread.parent.author_user_id
                      const prevTime = prevThread ? new Date(prevThread.parent.created_at).getTime() : 0
                      const currTime = new Date(thread.parent.created_at).getTime()
                      const withinTimeWindow = currTime - prevTime < 5 * 60 * 1000 // 5 minutes
                      const showHeader = !isSameAuthor || !withinTimeWindow

                      return (
                        <ThreadItem
                          key={thread.parent.id}
                          thread={thread}
                          currentUserId={currentUserId}
                          onDelete={deleteComment}
                          onEdit={updateComment}
                          onCreateReply={handleCreateReply}
                          onRetry={retryFailedMessage}
                          onDismiss={dismissFailedMessage}
                          showHeader={showHeader}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-border shrink-0 px-3 py-2">
        <CommentInput
          onSubmit={handleCreateComment}
          isSubmitting={false}
          placeholder="Write a message..."
          members={members || []}
        />
      </div>
    </div>
  )
}
