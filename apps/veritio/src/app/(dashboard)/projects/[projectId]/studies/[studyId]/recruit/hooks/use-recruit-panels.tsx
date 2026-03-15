'use client'

import { useEffect, useRef, useMemo } from 'react'
import { Settings2, MessageSquareText, Sparkles } from 'lucide-react'
import { useFloatingActionBar, type ActionButton } from '@/components/analysis/shared/floating-action-bar'
import { RecruitSettingsPanel } from '@/components/recruit/panels'
import { StudyCommentsPanel } from '@/components/collaboration/StudyCommentsPanel'
import { AssistantPanel } from '@/components/analysis/shared/assistant/assistant-panel'
import { useCommentNotifications } from '@/hooks/use-comment-notifications'
import { useAssistantPendingEvents } from '@/hooks/use-assistant-pending-events'
import { useSession } from '@veritio/auth/client'

interface UseRecruitPanelsOptions {
  participantUrl: string
  primaryColor: string
  logoUrl?: string
  isDraft: boolean
  studyTitle: string
  studyType: string
  hasEmailEnabled?: boolean
  emailSubject?: string
  emailBody?: string
  timeEstimate?: string
  incentiveConfig?: any
}

/**
 * Hook for managing floating action bar panels in the recruit page.
 *
 * Handles:
 * - Registering the settings panel action button
 * - Registering the comments panel with unread badge
 * - Auto-opening panel on page load
 *
 * Follows the same pattern as use-builder-panels.tsx for consistency.
 */
export function useRecruitPanels(
  studyId: string,
  options: UseRecruitPanelsOptions
) {
  const { registerPageActions, clearPageActions, setActivePanel, addPageAction, closePanel, activePanel } = useFloatingActionBar()
  const hasInitializedPanelRef = useRef(false)

  const { participantUrl, primaryColor, logoUrl, isDraft, studyTitle, studyType, hasEmailEnabled, emailSubject, emailBody, timeEstimate, incentiveConfig } = options

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
  } = useCommentNotifications(studyId, {
    currentUserId,
    enabled: !!studyId,
  })

  // Memoize panel content to prevent unnecessary re-renders
  const settingsPanelContent = useMemo(() => (
    <RecruitSettingsPanel
      participantUrl={participantUrl}
      primaryColor={primaryColor}
      logoUrl={logoUrl}
      isDraft={isDraft}
      studyId={studyId}
      studyTitle={studyTitle}
      hasEmailEnabled={hasEmailEnabled}
      emailSubject={emailSubject}
      emailBody={emailBody}
      timeEstimate={timeEstimate}
      incentiveConfig={incentiveConfig}
    />
  ), [participantUrl, primaryColor, logoUrl, isDraft, studyId, studyTitle, hasEmailEnabled, emailSubject, emailBody, timeEstimate, incentiveConfig])

  // Comments panel content
  const commentsPanelContent = useMemo(() => (
    <StudyCommentsPanel
      studyId={studyId}
      isConnected={isConnected}
      connectionError={connectionError}
      onReconnect={reconnect}
      isReconnecting={isReconnecting}
    />
  ), [studyId, isConnected, connectionError, reconnect, isReconnecting])

  // Comments action with unread badge (dot indicator)
  const commentsAction = useMemo((): ActionButton => ({
    id: 'study-comments',
    icon: MessageSquareText,
    tooltip: hasUnread ? 'Comments (new)' : 'Comments',
    panelTitle: 'Study Comments',
    panelContent: commentsPanelContent,
    badge: hasUnread || undefined, // true = red dot, undefined = no badge
  }), [commentsPanelContent, hasUnread])

  // Settings action
  const settingsAction = useMemo((): ActionButton => ({
    id: 'recruit-settings',
    icon: Settings2,
    tooltip: 'Distribution Settings',
    panelTitle: 'Distribution Settings',
    panelContent: settingsPanelContent,
    panelWidth: 360,
  }), [settingsPanelContent])

  // Combined actions array
  const actions = useMemo((): ActionButton[] => [
    settingsAction,
    commentsAction,
  ], [settingsAction, commentsAction])

  // Register actions and auto-open panel on mount
  useEffect(() => {
    if (!studyId) return

    // Register the actions
    registerPageActions(actions)

    // Auto-open panel on first mount only
    if (!hasInitializedPanelRef.current) {
      hasInitializedPanelRef.current = true
      // Use setTimeout to ensure registration completes first
      setTimeout(() => {
        setActivePanel('recruit-settings')
      }, 0)
    }
  }, [studyId, actions, registerPageActions, setActivePanel])

  // Dynamically update comments badge when unread state changes
  useEffect(() => {
    addPageAction(commentsAction)
  }, [commentsAction, addPageAction])

  // AI assistant panel
  const isPanelOpen = activePanel === 'ai-assistant'
  const { pendingCount } = useAssistantPendingEvents(isPanelOpen)

   
  const assistantPanelContent = useMemo(() => (
    <AssistantPanel
      studyId={studyId}
      studyType={studyType as any}
      mode="builder"
      onClose={() => closePanel()}
      isPanelOpen={isPanelOpen}
    />
  ), [studyId, studyType, closePanel, isPanelOpen])

  // Register AI assistant action
  useEffect(() => {
    if (!assistantPanelContent) return

    const assistantAction: ActionButton = {
      id: 'ai-assistant',
      icon: Sparkles,
      tooltip: 'Veritio AI',
      panelWidth: 420,
      panelContent: assistantPanelContent,
      badge: pendingCount > 0 ? pendingCount : undefined,
    }

    addPageAction(assistantAction)
  }, [assistantPanelContent, addPageAction, pendingCount])

  // Listen for toast "Open Assistant" action clicks
  useEffect(() => {
    const handleOpenAssistant = () => setActivePanel('ai-assistant')
    document.addEventListener('open-ai-assistant', handleOpenAssistant)
    return () => document.removeEventListener('open-ai-assistant', handleOpenAssistant)
  }, [setActivePanel])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPageActions()
    }
  }, [clearPageActions])
}
