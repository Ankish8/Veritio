'use client'

import { useEffect, useRef, useMemo } from 'react'
import { Info, Settings2, MessageSquareText, Sparkles } from 'lucide-react'
import { useFloatingActionBar, type ActionButton } from '@/components/analysis/shared/floating-action-bar'
import { BuilderStudyInfoPanel, BuilderTaskOptionsPanel, BuilderPrototypeSettingsPanel, BuilderPrototypeTaskOptionsPanel, BuilderFirstClickTaskOptionsPanel, BuilderFirstImpressionSettingsPanel, BuilderLiveWebsiteSettingsPanel, BuilderCardSortSettingsPanel, BuilderWidgetSettingsPanel } from '@/components/builders/panels'
import { StudyCommentsPanel } from '@/components/collaboration/StudyCommentsPanel'
import { AssistantPanel } from '@/components/analysis/shared/assistant/assistant-panel'
import { useCommentNotifications } from '@/hooks/use-comment-notifications'
import { useActiveFlowSection } from '@/stores/study-flow-builder'
import { useAssistantPendingEvents } from '@/hooks/use-assistant-pending-events'
import { useSession } from '@veritio/auth/client'
import type { Study } from '@veritio/study-types'
import type { BuilderTabId } from '@/components/builders/shared'

/**
 * Hook for managing floating action bar panels in the builder.
 *
 * Handles:
 * - Registering page-specific action buttons
 * - Auto-opening/closing panels based on active tab
 * - Setting keyboard shortcuts context for tree editing
 *
 * Performance: Action arrays are memoized per-tab to prevent unnecessary
 * context updates on tab switches. Only registers new actions when the
 * actual action configuration changes.
 */
export function useBuilderPanels(
  study: Study | null,
  activeTab: BuilderTabId,
  isTreeTest: boolean,
  isPrototypeTest: boolean = false,
  isFirstClickTest: boolean = false,
  isFirstImpressionTest: boolean = false,
  isCardSort: boolean = false,
  isLiveWebsiteTest: boolean = false,
) {
  const { registerPageActions, clearPageActions, setActivePanel, closePanel, setShortcutsContext, setStudyType, addPageAction, activePanel } = useFloatingActionBar()
  const hasInitializedPanelRef = useRef(false)
  const lastRegisteredTabRef = useRef<BuilderTabId | null>(null)
  // Track activePanel via ref so the auto-open/close effect can read it
  // without adding it as a dependency (which would cause the effect to
  // fight with user interactions like toggling the AI panel)
  const activePanelRef = useRef(activePanel)
  activePanelRef.current = activePanel // eslint-disable-line react-hooks/refs

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

  // Track active flow section for AI assistant context
  const activeFlowSection = useActiveFlowSection()

  // Track pending AI assistant events
  const isPanelOpen = activePanel === 'ai-assistant'
  const { pendingCount } = useAssistantPendingEvents(isPanelOpen)

  // Memoize panel content to prevent unnecessary re-renders
   
  const studyInfoPanelContent = useMemo(() => (
    study?.id ? <BuilderStudyInfoPanel studyType={study.study_type || 'card_sort'} studyId={study.id} /> : null
  ), [study?.study_type, study?.id])

  const taskOptionsPanelContent = useMemo(() => (
    <BuilderTaskOptionsPanel />
  ), [])

   
  const prototypeSettingsPanelContent = useMemo(() => (
    study?.id ? <BuilderPrototypeSettingsPanel studyId={study.id} /> : null
  ), [study?.id])

  const prototypeTaskOptionsPanelContent = useMemo(() => (
    <BuilderPrototypeTaskOptionsPanel />
  ), [])

  const firstClickTaskOptionsPanelContent = useMemo(() => (
    <BuilderFirstClickTaskOptionsPanel />
  ), [])

  const liveWebsiteSettingsPanelContent = useMemo(() => (
    <BuilderLiveWebsiteSettingsPanel />
  ), [])

  const firstImpressionSettingsPanelContent = useMemo(() => (
    <BuilderFirstImpressionSettingsPanel />
  ), [])

  const cardSortSettingsPanelContent = useMemo(() => (
    <BuilderCardSortSettingsPanel />
  ), [])

  const widgetSettingsPanelContent = useMemo(() => (
    <BuilderWidgetSettingsPanel />
  ), [])

  // Comments panel - shown on ALL tabs for team collaboration
   
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
  ), [study?.id, isConnected, connectionError, reconnect, isReconnecting])

  // AI assistant panel
   
  const assistantPanelContent = useMemo(() => (
    study?.id ? (
      <AssistantPanel
        studyId={study.id}
        studyType={study.study_type || 'card_sort'}
        mode="builder"
        onClose={() => closePanel()}
        isPanelOpen={isPanelOpen}
        activeTab={activeTab}
        activeFlowSection={activeTab === 'study-flow' ? activeFlowSection : undefined}
      />
    ) : null
  ), [study?.id, study?.study_type, closePanel, isPanelOpen, activeTab, activeFlowSection])

  // Comments action - shared across all tabs with unread badge (dot indicator)
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

  // Study info action - shared across all tabs
  const studyInfoAction = useMemo((): ActionButton | null =>
    studyInfoPanelContent ? {
      id: 'builder-study-info',
      icon: Info,
      tooltip: 'Study Info',
      panelTitle: 'Study Info',
      panelContent: studyInfoPanelContent,
    } : null
  , [studyInfoPanelContent])

  // Memoize entire action arrays per tab to prevent object recreation
  // Each tab includes study info + comments for context and collaboration
  const detailsActions = useMemo((): ActionButton[] => {
    const actions: ActionButton[] = []
    if (studyInfoAction) actions.push(studyInfoAction)
    if (commentsAction) actions.push(commentsAction)
    return actions
  }, [studyInfoAction, commentsAction])

  const tasksActions = useMemo((): ActionButton[] => {
    const actions: ActionButton[] = []
    if (studyInfoAction) actions.push(studyInfoAction)
    if (isTreeTest) {
      actions.push({
        id: 'builder-task-options',
        icon: Settings2,
        tooltip: 'Task Options',
        panelTitle: 'Task Options',
        panelContent: taskOptionsPanelContent,
      })
    }
    if (commentsAction) actions.push(commentsAction)
    return actions
  }, [studyInfoAction, isTreeTest, taskOptionsPanelContent, commentsAction])

  const prototypeTasksActions = useMemo((): ActionButton[] => {
    const actions: ActionButton[] = []
    if (studyInfoAction) actions.push(studyInfoAction)
    if (isPrototypeTest) {
      actions.push({
        id: 'builder-prototype-task-options',
        icon: Settings2,
        tooltip: 'Task Settings',
        panelTitle: 'Task Settings',
        panelContent: prototypeTaskOptionsPanelContent,
      })
    }
    if (commentsAction) actions.push(commentsAction)
    return actions
  }, [studyInfoAction, isPrototypeTest, prototypeTaskOptionsPanelContent, commentsAction])

  const prototypeActions = useMemo((): ActionButton[] => {
    const actions: ActionButton[] = []
    if (studyInfoAction) actions.push(studyInfoAction)
    if (isPrototypeTest && prototypeSettingsPanelContent) {
      actions.push({
        id: 'builder-prototype-settings',
        icon: Settings2,
        tooltip: 'Prototype Settings',
        panelTitle: 'Prototype Settings',
        panelContent: prototypeSettingsPanelContent,
      })
    }
    if (commentsAction) actions.push(commentsAction)
    return actions
  }, [studyInfoAction, isPrototypeTest, prototypeSettingsPanelContent, commentsAction])

  const firstClickTasksActions = useMemo((): ActionButton[] => {
    const actions: ActionButton[] = []
    if (studyInfoAction) actions.push(studyInfoAction)
    if (isFirstClickTest) {
      actions.push({
        id: 'builder-first-click-task-options',
        icon: Settings2,
        tooltip: 'Task Settings',
        panelTitle: 'Task Settings',
        panelContent: firstClickTaskOptionsPanelContent,
      })
    }
    if (commentsAction) actions.push(commentsAction)
    return actions
  }, [studyInfoAction, isFirstClickTest, firstClickTaskOptionsPanelContent, commentsAction])

  const liveWebsiteTasksActions = useMemo((): ActionButton[] => {
    const actions: ActionButton[] = []
    if (studyInfoAction) actions.push(studyInfoAction)
    if (isLiveWebsiteTest) {
      actions.push({
        id: 'builder-live-website-settings',
        icon: Settings2,
        tooltip: 'Task Settings',
        panelTitle: 'Task Settings',
        panelContent: liveWebsiteSettingsPanelContent,
      })
    }
    if (commentsAction) actions.push(commentsAction)
    return actions
  }, [studyInfoAction, isLiveWebsiteTest, liveWebsiteSettingsPanelContent, commentsAction])

  const firstImpressionDesignsActions = useMemo((): ActionButton[] => {
    const actions: ActionButton[] = []
    if (studyInfoAction) actions.push(studyInfoAction)
    if (isFirstImpressionTest) {
      actions.push({
        id: 'builder-first-impression-settings',
        icon: Settings2,
        tooltip: 'Design Settings',
        panelTitle: 'Design Settings',
        panelContent: firstImpressionSettingsPanelContent,
      })
    }
    if (commentsAction) actions.push(commentsAction)
    return actions
  }, [studyInfoAction, isFirstImpressionTest, firstImpressionSettingsPanelContent, commentsAction])

  const cardSortContentActions = useMemo((): ActionButton[] => {
    const actions: ActionButton[] = []
    if (studyInfoAction) actions.push(studyInfoAction)
    if (isCardSort) {
      actions.push({
        id: 'builder-card-sort-settings',
        icon: Settings2,
        tooltip: 'Card Sort Settings',
        panelTitle: 'Card Sort Settings',
        panelContent: cardSortSettingsPanelContent,
      })
    }
    if (commentsAction) actions.push(commentsAction)
    return actions
  }, [studyInfoAction, isCardSort, cardSortSettingsPanelContent, commentsAction])

  const sharingActions = useMemo((): ActionButton[] => {
    const actions: ActionButton[] = []
    if (studyInfoAction) actions.push(studyInfoAction)
    actions.push({
      id: 'builder-widget-settings',
      icon: Settings2,
      tooltip: 'Widget Settings',
      panelTitle: 'Widget Settings',
      panelContent: widgetSettingsPanelContent,
      panelWidth: 360, // Custom width for optimal widget settings layout
    })
    if (commentsAction) actions.push(commentsAction)
    return actions
  }, [studyInfoAction, widgetSettingsPanelContent, commentsAction])

  // Default actions for tabs without specific actions (Study Info + Comments)
  const defaultActions = useMemo((): ActionButton[] => {
    const actions: ActionButton[] = []
    if (studyInfoAction) actions.push(studyInfoAction)
    if (commentsAction) actions.push(commentsAction)
    return actions
  }, [studyInfoAction, commentsAction])

  // Map of tab to its memoized actions - this object reference is stable
  const actionsMap = useMemo(() => ({
    details: detailsActions,
    tasks: tasksActions,
    'prototype-tasks': prototypeTasksActions,
    prototype: prototypeActions,
    'first-click-tasks': firstClickTasksActions,
    'first-impression-designs': firstImpressionDesignsActions,
    'live-website-tasks': liveWebsiteTasksActions,
    'live-website-setup': defaultActions,
    content: cardSortContentActions,
    sharing: sharingActions,
    // Tabs without specific actions use default (just Comments)
    'study-flow': defaultActions,
    settings: defaultActions,
    branding: defaultActions,
    tree: defaultActions,
  }), [detailsActions, tasksActions, prototypeTasksActions, prototypeActions, firstClickTasksActions, liveWebsiteTasksActions, firstImpressionDesignsActions, cardSortContentActions, sharingActions, defaultActions])

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
      'live_website_test': 'first-click', // Reuse first-click context for live website (closest match)
    }
    setStudyType(typeMap[study.study_type] || null)

    return () => setStudyType(null)
  }, [study?.study_type, setStudyType])

  // Register panels based on active tab - only when tab actually changes
  // Note: registerPageActions replaces previous actions, so we don't need to clear first
  useEffect(() => {
    if (!study) return

    // Skip if we already registered for this tab
    if (lastRegisteredTabRef.current === activeTab) return
    lastRegisteredTabRef.current = activeTab

    const actions = actionsMap[activeTab as keyof typeof actionsMap] || []
    registerPageActions(actions)
  }, [study, activeTab, actionsMap, registerPageActions])

  // Dynamically update comments badge when unread state changes
  // This is separate from the tab-based registration because we need to update
  // the badge without waiting for a tab change
  useEffect(() => {
    if (!commentsAction) return
    addPageAction(commentsAction)
  }, [commentsAction, addPageAction])

  // Listen for toast "Open Assistant" action clicks
  useEffect(() => {
    const handleOpenAssistant = () => setActivePanel('ai-assistant')
    document.addEventListener('open-ai-assistant', handleOpenAssistant)
    return () => document.removeEventListener('open-ai-assistant', handleOpenAssistant)
  }, [setActivePanel])

  // Listen for "Build with AI" content builder button clicks
  useEffect(() => {
    const handleBuildContent = (e: CustomEvent) => {
      setActivePanel('ai-assistant')
      // Delay secondary event to let the panel mount/render before it fires
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('ai-assistant-build-content', {
          detail: e.detail
        }))
      }, 150)
    }
    window.addEventListener('open-ai-build-content', handleBuildContent as EventListener)
    return () => window.removeEventListener('open-ai-build-content', handleBuildContent as EventListener)
  }, [setActivePanel])

  // Register AI assistant action (persists across all tabs)
  // activeTab is included so the assistant is re-added after registerPageActions
  // replaces all actions on tab switch (registerPageActions wipes everything,
  // so addPageAction must re-run to restore the assistant)
  useEffect(() => {
    if (!assistantPanelContent) return

    const assistantAction: ActionButton = {
      id: 'ai-assistant',
      icon: Sparkles,
      tooltip: 'Veritio AI',
      panelWidth: 420,
      panelContent: assistantPanelContent,
      badge: pendingCount > 0 ? pendingCount : undefined,
      order: 0,
    }

    addPageAction(assistantAction)
  }, [assistantPanelContent, addPageAction, pendingCount, activeTab])

  // Cleanup only on unmount - separate effect to avoid clearing on every tab switch
  // This prevents unnecessary state updates in the floating action bar context
  useEffect(() => {
    return () => {
      lastRegisteredTabRef.current = null
      clearPageActions()
    }
  }, [clearPageActions])

  // Auto-open/close panel and set shortcuts context based on active tab
  useEffect(() => {
    if (!study) return

    // Panel config: which tabs should auto-open which panel
    const panelForTab: Record<string, string | null> = {
      'details': 'builder-study-info',
      'tree': isTreeTest ? 'shortcuts' : null,
      'tasks': isTreeTest ? 'builder-task-options' : null,
      'prototype-tasks': isPrototypeTest ? 'builder-prototype-task-options' : null,
      'prototype': isPrototypeTest ? 'builder-prototype-settings' : null,
      'first-click-tasks': isFirstClickTest ? 'builder-first-click-task-options' : null,
      'first-impression-designs': isFirstImpressionTest ? 'builder-first-impression-settings' : null,
      'live-website-tasks': isLiveWebsiteTest ? 'builder-live-website-settings' : null,
      'live-website-setup': null,
      'content': isCardSort ? 'builder-card-sort-settings' : null,
      'sharing': null, // Panel visibility for sharing tab is controlled by sub-tab state in SharingTab component
      'study-flow': null,
      'settings': null,
      'branding': null,
    }

    // Set shortcuts context for tree tab
    if (activeTab === 'tree' && isTreeTest) {
      setShortcutsContext('builder-tree')
    } else {
      setShortcutsContext(null)
    }

    const panelId = panelForTab[activeTab]

    // On first initialization, open the appropriate panel
    if (!hasInitializedPanelRef.current) {
      if (panelId) {
        setActivePanel(panelId)
      }
      hasInitializedPanelRef.current = true
      return
    }

    // On tab change, auto-open/close panel.
    // Preserve persistent panels (AI assistant, comments) — only close
    // contextual builder panels when switching to tabs without auto-panels.
    if (panelId) {
      setActivePanel(panelId)
    } else if (activePanelRef.current !== 'ai-assistant' && activePanelRef.current !== 'study-comments') {
      setActivePanel(null)
    }
  }, [study, activeTab, isTreeTest, isPrototypeTest, isFirstClickTest, isFirstImpressionTest, isCardSort, isLiveWebsiteTest, setActivePanel, setShortcutsContext])
}
