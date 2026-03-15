'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useMemo, useRef } from 'react'
import { LucideIcon } from 'lucide-react'
import type { ShortcutSection } from '@/lib/keyboard-shortcuts/types'

// Extended panel types to support dynamic page-specific panels
export type PanelType = 'knowledge' | 'shortcuts' | 'study-info' | 'participant-detail' | string | null

// Shortcuts context for context-aware keyboard shortcuts panel
export type ShortcutsContext = 'default' | 'builder-tree' | 'builder-tasks' | null

// Study type for context-aware knowledge base
export type StudyType = 'card-sort' | 'tree-test' | 'survey' | 'prototype' | 'first-click' | 'first-impression' | null

import type { PanelWidth } from './PanelContainer'

// Action button configuration for dynamic icons
export interface ActionButton {
  id: string
  icon: LucideIcon
  tooltip: string
  // Optional: custom panel content renderer
  panelTitle?: string
  panelContent?: ReactNode
  /** Custom header content (replaces default title + close) */
  panelHeaderContent?: ReactNode
  /** Panel width - 'default' (320px), 'wide' (480px), 'extra-wide' (560px), or custom number */
  panelWidth?: PanelWidth
  /** If true, this panel is hidden from the action bar icons but can still be opened programmatically */
  hidden?: boolean
  /** Badge count to show on the icon (true = dot, number = count) */
  badge?: number | boolean
  /** Sort order for icon positioning (lower = higher in the list). Default: 10 */
  order?: number
}

/** Dynamic panel content for programmatic panel opening */
export interface DynamicPanelConfig {
  content: ReactNode
  title?: string
  width?: PanelWidth
  /** Custom header that replaces default title + close */
  headerContent?: ReactNode
  /** Hide the panel container's header entirely (use when content has its own header) */
  hideHeader?: boolean
}

interface FloatingActionBarContextValue {
  activePanel: PanelType
  setActivePanel: (panel: PanelType) => void
  togglePanel: (panel: PanelType) => void
  closePanel: () => void
  // Page-specific actions
  pageActions: ActionButton[]
  registerPageActions: (actions: ActionButton[]) => void
  clearPageActions: () => void
  /** Add a single page action without replacing existing ones */
  addPageAction: (action: ActionButton) => void
  /** Remove a single page action by id */
  removePageAction: (actionId: string) => void
  // Get panel info for custom panels
  getCustomPanel: (panelId: string) => ActionButton | undefined
  // Context-aware shortcuts
  shortcutsContext: ShortcutsContext
  setShortcutsContext: (context: ShortcutsContext) => void
  // Shortcut sections synced from keyboard shortcuts store
  shortcutSections: ShortcutSection[]
  setShortcutSections: (sections: ShortcutSection[]) => void
  shortcutActiveContext: string | null
  setShortcutActiveContext: (context: string | null) => void
  // Study type for knowledge base context
  studyType: StudyType
  setStudyType: (type: StudyType) => void
  // Dynamic panel content (for programmatic opening with custom content)
  dynamicPanel: DynamicPanelConfig | null
  /** Open a panel with dynamic content (content is rendered directly, not from registered actions) */
  openDynamicPanel: (panelId: string, config: DynamicPanelConfig) => void
  /** Update the content of the currently open dynamic panel (if any) */
  updateDynamicPanel: (config: DynamicPanelConfig) => void
  // Mobile modal state (for showing panels as bottom sheet on mobile)
  /** Whether the mobile panel modal is open */
  isMobileModalOpen: boolean
  /** Set mobile modal open state */
  setMobileModalOpen: (open: boolean) => void
  /** Open a panel in mobile modal mode */
  openMobilePanel: (panelId: string) => void
}

const FloatingActionBarContext = createContext<FloatingActionBarContextValue | null>(null)

export function useFloatingActionBar() {
  const context = useContext(FloatingActionBarContext)
  if (!context) {
    throw new Error('useFloatingActionBar must be used within FloatingActionBarProvider')
  }
  return context
}

interface FloatingActionBarProviderProps {
  children: ReactNode
}

export function FloatingActionBarProvider({ children }: FloatingActionBarProviderProps) {
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  const [pageActions, setPageActions] = useState<ActionButton[]>([])
  const [shortcutsContext, setShortcutsContext] = useState<ShortcutsContext>(null)
  const [shortcutSections, setShortcutSections] = useState<ShortcutSection[]>([])
  const [shortcutActiveContext, setShortcutActiveContext] = useState<string | null>(null)
  const [studyType, setStudyType] = useState<StudyType>(null)
  const [dynamicPanel, setDynamicPanel] = useState<DynamicPanelConfig | null>(null)
  const [isMobileModalOpen, setMobileModalOpen] = useState(false)

  const togglePanel = useCallback((panel: PanelType) => {
    setActivePanel((current) => {
      if (current === panel) {
        // Closing the panel - clear dynamic content
        setDynamicPanel(null)
        return null
      }
      return panel
    })
  }, [])

  const closePanel = useCallback(() => {
    setActivePanel(null)
    setDynamicPanel(null)
  }, [])

  // Track current actions ref to avoid unnecessary state updates
  const pageActionsRef = useRef<ActionButton[]>([])

  // Register page actions with optional auto-open panel
  // Uses reference equality to skip updates when the same memoized array is passed
  const registerPageActions = useCallback((actions: ActionButton[], autoOpenPanelId?: string) => {
    // Skip update if the actions array reference hasn't changed
    // This prevents context re-renders when memoized action arrays are passed
    if (pageActionsRef.current === actions) return

    pageActionsRef.current = actions
    setPageActions(actions)
    // Auto-open the specified panel if provided
    if (autoOpenPanelId) {
      setActivePanel(autoOpenPanelId)
    }
  }, [])

  const clearPageActions = useCallback(() => {
    pageActionsRef.current = []
    setPageActions([])
    // Close panel if it was a page-specific panel
    setActivePanel((current) => {
      if (current === 'knowledge' || current === 'shortcuts') return current
      setDynamicPanel(null)
      return null
    })
  }, [])

  // Add a single page action without replacing existing ones
  const addPageAction = useCallback((action: ActionButton) => {
    setPageActions((current) => {
      // Check if action already exists
      if (current.some(a => a.id === action.id)) {
        // Update existing action
        const updated = current.map(a => a.id === action.id ? action : a)
        pageActionsRef.current = updated
        return updated
      }
      // Add new action
      const updated = [...current, action]
      pageActionsRef.current = updated
      return updated
    })
  }, [])

  // Remove a single page action by id
  const removePageAction = useCallback((actionId: string) => {
    setPageActions((current) => {
      const updated = current.filter(a => a.id !== actionId)
      pageActionsRef.current = updated
      return updated
    })
    // Close panel if removing the currently active panel
    setActivePanel((current) => {
      if (current === actionId) {
        setDynamicPanel(null)
        return null
      }
      return current
    })
  }, [])

  const getCustomPanel = useCallback((panelId: string) => {
    return pageActions.find(action => action.id === panelId)
  }, [pageActions])

  // Open a panel with dynamic content
  const openDynamicPanel = useCallback((panelId: string, config: DynamicPanelConfig) => {
    setDynamicPanel(config)
    setActivePanel(panelId)
  }, [])

  // Update the content of the currently open dynamic panel
  const updateDynamicPanel = useCallback((config: DynamicPanelConfig) => {
    setDynamicPanel(config)
  }, [])

  // Open a panel in mobile modal mode
  const openMobilePanel = useCallback((panelId: string) => {
    setActivePanel(panelId)
    setMobileModalOpen(true)
  }, [])

  const value = useMemo(() => ({
    activePanel,
    setActivePanel,
    togglePanel,
    closePanel,
    pageActions,
    registerPageActions,
    clearPageActions,
    addPageAction,
    removePageAction,
    getCustomPanel,
    shortcutsContext,
    setShortcutsContext,
    shortcutSections,
    setShortcutSections,
    shortcutActiveContext,
    setShortcutActiveContext,
    studyType,
    setStudyType,
    dynamicPanel,
    openDynamicPanel,
    updateDynamicPanel,
    isMobileModalOpen,
    setMobileModalOpen,
    openMobilePanel,
  }), [activePanel, togglePanel, closePanel, pageActions, registerPageActions, clearPageActions, addPageAction, removePageAction, getCustomPanel, shortcutsContext, shortcutSections, shortcutActiveContext, studyType, dynamicPanel, openDynamicPanel, updateDynamicPanel, isMobileModalOpen, openMobilePanel])

  return (
    <FloatingActionBarContext.Provider value={value}>
      {children}
    </FloatingActionBarContext.Provider>
  )
}
