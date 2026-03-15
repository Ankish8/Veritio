'use client'

/**
 * Hook for managing floating action bar panels in results pages.
 *
 * Handles:
 * - Registering the comments panel with unread badge
 * - Setting study type context for Knowledge Base
 *
 * Follows the same pattern as use-builder-panels.tsx for consistency.
 */

import { useEffect, useMemo } from 'react'
import { MessageSquareText } from 'lucide-react'
import { useFloatingActionBar, type ActionButton } from '@/components/analysis/shared/floating-action-bar'
import { StudyCommentsPanel } from '@/components/collaboration/StudyCommentsPanel'
import { useCommentNotifications } from '@/hooks/use-comment-notifications'
import { useSession } from '@veritio/auth/client'
import type { Study } from '@veritio/study-types'

export function useResultsPanels(study: Study | null) {
  const { setStudyType, addPageAction, removePageAction } = useFloatingActionBar()

  // Get current user for comment notifications
  const { data: session } = useSession()
  const currentUserId = session?.user?.id

  // Track unread comments, connection status, and show toast notifications
  const {
    hasUnread,
    isConnected,
    connectionError,
    reconnect,
    isReconnecting,
  } = useCommentNotifications(study?.id ?? null, {
    currentUserId,
    enabled: !!study?.id,
  })

  // Comments panel content
  const commentsPanelContent = useMemo(() => (
    study?.id ? (
      <StudyCommentsPanel
        studyId={study.id}
        isConnected={isConnected}
        connectionError={connectionError}
        onReconnect={reconnect}
        isReconnecting={isReconnecting}
      />
    ) : null
  ), [study, isConnected, connectionError, reconnect, isReconnecting])

  // Comments action with unread badge (dot indicator)
  const commentsAction = useMemo((): ActionButton | null =>
    commentsPanelContent ? {
      id: 'study-comments',
      icon: MessageSquareText,
      tooltip: hasUnread ? 'Comments (new)' : 'Comments',
      panelTitle: 'Study Comments',
      panelContent: commentsPanelContent,
      badge: hasUnread || undefined, // true = red dot, undefined = no badge
    } : null
  , [commentsPanelContent, hasUnread])

  // Set study type for knowledge base context
  useEffect(() => {
    if (!study?.study_type) {
      setStudyType(null)
      return
    }

    // Map database study types to context study types
    const typeMap: Record<string, 'card-sort' | 'tree-test' | 'survey' | 'prototype' | 'first-click' | 'first-impression'> = {
      'card_sort': 'card-sort',
      'tree_test': 'tree-test',
      'survey': 'survey',
      'prototype_test': 'prototype',
      'first_click': 'first-click',
      'first_impression': 'first-impression',
    }
    setStudyType(typeMap[study.study_type] || null)

    return () => setStudyType(null)
  }, [study?.study_type, setStudyType])

  // Register comments panel
  useEffect(() => {
    if (!study || !commentsAction) return

    addPageAction(commentsAction)

    return () => {
      removePageAction('study-comments')
    }
  }, [study, commentsAction, addPageAction, removePageAction])
}
