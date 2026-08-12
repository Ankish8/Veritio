'use client'

import { useCallback, useMemo, useRef, useEffect, useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { Loader2, MessageSquareText, Search, X } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useStudyComments, type CommentThread } from '@/hooks/use-study-comments'
import { useOrganizationMembers } from '@/hooks/use-organizations'
import { useCurrentOrganizationId } from '@/stores/collaboration-store'
import { useSession } from '@veritio/auth/client'
import { toast } from '@/components/ui/sonner'
import { stripMentionMarkup } from '@/lib/comments/mention-format'

import { CommentComposer, CommentThreadCard, DateSeparator } from './comments'

/**
 * Study comments.
 *
 * Reworked from a chat log into a review surface. The data model was always
 * threaded, but the presentation was Slack-like — newest at the bottom,
 * auto-scroll, own messages right-aligned — which left no way to close a
 * discussion out and no answer to "what's still open?". Threads can now be
 * resolved, and the default view is the unresolved ones.
 *
 * Dropped deliberately: auto-scroll-to-bottom and the 5-minute author grouping.
 * Both are chat affordances that fight a list ordered by what still needs
 * attention. Date separators stay — they're useful in either model.
 */

type FilterMode = 'open' | 'resolved' | 'all'

const FILTERS: Array<{ id: FilterMode; label: string }> = [
  { id: 'open', label: 'Open' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'all', label: 'All' },
]

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
  const [filter, setFilter] = useState<FilterMode>('open')
  const [search, setSearch] = useState('')
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const {
    comments,
    threads,
    isLoading,
    error,
    createComment,
    updateComment,
    deleteComment,
    setResolved,
    toggleReaction,
    hasMore,
    isLoadingMore,
    loadMore,
    totalCount,
    retryFailedMessage,
    dismissFailedMessage,
  } = useStudyComments(studyId)

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || isLoadingMore || !hasMore) return
    if (container.scrollTop < 100) void loadMore()
  }, [hasMore, isLoadingMore, loadMore])

  /**
   * Deep link support: `?comment=<id>` opens the thread containing that comment
   * and highlights it briefly. Falls back silently when the comment isn't in
   * the loaded page.
   */
  useEffect(() => {
    if (typeof window === 'undefined' || isLoading) return
    const target = new URLSearchParams(window.location.search).get('comment')
    if (!target) return

    // A linked comment may well be resolved; don't hide what someone was sent to.
    // Deriving this in a useState initializer instead would read window during
    // SSR and hydrate to a different filter, so it belongs in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilter('all')
    setHighlightedId(target)

    const node = document.querySelector(`[data-comment-id="${CSS.escape(target)}"]`)
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' })

    const timer = setTimeout(() => setHighlightedId(null), 3000)
    return () => clearTimeout(timer)
  }, [isLoading, threads.length])

  const handleCopyLink = useCallback((commentId: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('comment', commentId)
    navigator.clipboard
      .writeText(url.toString())
      .then(() => toast.success('Link copied'))
      .catch(() => toast.error('Could not copy link'))
  }, [])

  const visibleThreads = useMemo(() => {
    const query = search.trim().toLowerCase()

    return threads
      .filter((thread) => {
        const isResolved = !!thread.parent.resolved_at
        if (filter === 'open' && isResolved) return false
        if (filter === 'resolved' && !isResolved) return false

        if (!query) return true
        // Search the whole thread, not just the root: the answer someone
        // remembers is usually in a reply.
        return [thread.parent, ...thread.replies].some((c) =>
          stripMentionMarkup(c.content).toLowerCase().includes(query)
        )
      })
      .sort((a, b) => {
        const aResolved = !!a.parent.resolved_at
        const bResolved = !!b.parent.resolved_at
        if (aResolved !== bResolved) return aResolved ? 1 : -1
        // Within a group, most recently active first.
        const aTime = new Date(
          a.replies.at(-1)?.created_at ?? a.parent.created_at
        ).getTime()
        const bTime = new Date(
          b.replies.at(-1)?.created_at ?? b.parent.created_at
        ).getTime()
        return bTime - aTime
      })
  }, [threads, filter, search])

  const groupedByDate = useMemo(() => {
    const groups: { label: string; date: Date; threads: CommentThread[] }[] = []
    let current: (typeof groups)[0] | null = null

    for (const thread of visibleThreads) {
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
  }, [visibleThreads])

  const openCount = useMemo(
    () => threads.filter((t) => !t.parent.resolved_at).length,
    [threads]
  )

  const handleCreateComment = async (content: string) => {
    createComment(content).catch((err) => {
      toast.error('Failed to send message', {
        description: err instanceof Error ? err.message : 'Please try again',
      })
    })
  }

  const handleCreateReply = async (parentId: string, content: string) => {
    await createComment(content, parentId)
  }

  const emptyMessage =
    search.trim().length > 0
      ? 'No comments match your search'
      : filter === 'open'
        ? 'No open discussions'
        : filter === 'resolved'
          ? 'Nothing resolved yet'
          : 'No comments yet'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-2 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex-1 text-xs text-muted-foreground">
            Discuss this study with your team. Comments are visible to all collaborators.
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {isConnected ? (
              <div
                className="flex items-center gap-1"
                title="Checking for new comments continuously"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="hidden text-[12px] text-muted-foreground sm:inline">Synced</span>
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

        <div className="flex items-center gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'rounded-full px-2.5 py-1 text-[12px] transition-colors',
                filter === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {f.label}
              {f.id === 'open' && openCount > 0 && (
                <span className="ml-1 tabular-nums opacity-80">{openCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search comments..."
            className="h-8 pl-7 pr-7 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-full space-y-3 overflow-y-auto px-3 py-3"
        >
          {isLoadingMore && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-xs text-muted-foreground">Loading older comments...</span>
            </div>
          )}

          {hasMore && !isLoadingMore && threads.length > 0 && (
            <div className="flex justify-center py-1">
              <button
                onClick={() => loadMore()}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Load older comments
                {totalCount > comments.length && ` (${totalCount - comments.length} more)`}
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-sm text-destructive">Failed to load comments</p>
              <p className="mt-1 text-xs text-muted-foreground">{String(error)}</p>
            </div>
          ) : visibleThreads.length === 0 ? (
            <div className="py-8 text-center">
              <MessageSquareText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">{emptyMessage}</p>
              {filter === 'open' && !search && threads.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Start a discussion about this study
                </p>
              )}
            </div>
          ) : (
            groupedByDate.map((group) => (
              <div key={group.label} className="space-y-2">
                <DateSeparator label={group.label} />
                {group.threads.map((thread) => (
                  <CommentThreadCard
                    key={thread.parent.id}
                    thread={thread}
                    currentUserId={currentUserId}
                    members={members || []}
                    onDelete={deleteComment}
                    onEdit={updateComment}
                    onCreateReply={handleCreateReply}
                    onToggleResolved={setResolved}
                    onToggleReaction={toggleReaction}
                    onCopyLink={handleCopyLink}
                    onRetry={retryFailedMessage}
                    onDismiss={dismissFailedMessage}
                    highlighted={
                      highlightedId === thread.parent.id ||
                      thread.replies.some((r) => r.id === highlightedId)
                    }
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border px-3 py-2">
        <CommentComposer
          onSubmit={handleCreateComment}
          placeholder="Start a discussion..."
          members={members || []}
        />
      </div>
    </div>
  )
}
