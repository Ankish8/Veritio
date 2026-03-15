'use client'

import { createContext, useContext, useState, useCallback, type ReactNode, useMemo, useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { ShortcutSection } from './panels/KeyboardShortcutsPanel'

export type PanelType = 'knowledge' | 'shortcuts' | 'study-info' | 'participant-detail' | string | null
export type ShortcutsContext = 'default' | 'builder-tree' | 'builder-tasks' | null
export type StudyType = 'card-sort' | 'tree-test' | 'survey' | 'prototype' | 'first-click' | 'first-impression' | null

import type { PanelWidth } from './PanelContainer'

export interface ActionButton {
  id: string
  icon: LucideIcon
  tooltip: string
  panelTitle?: string
  panelContent?: ReactNode
  panelHeaderContent?: ReactNode
  panelWidth?: PanelWidth
  hidden?: boolean
  badge?: number | boolean
  order?: number
}

export interface DynamicPanelConfig {
  content: ReactNode
  title?: string
  width?: PanelWidth
  headerContent?: ReactNode
  hideHeader?: boolean
}

interface FloatingActionBarContextValue {
  activePanel: PanelType
  setActivePanel: (panel: PanelType) => void
  togglePanel: (panel: PanelType) => void
  closePanel: () => void
  pageActions: ActionButton[]
  registerPageActions: (actions: ActionButton[]) => void
  clearPageActions: () => void
  addPageAction: (action: ActionButton) => void
  removePageAction: (actionId: string) => void
  getCustomPanel: (panelId: string) => ActionButton | undefined
  shortcutsContext: ShortcutsContext
  setShortcutsContext: (context: ShortcutsContext) => void
  shortcutSections: ShortcutSection[]
  shortcutActiveContext: string | null
  setShortcutSections: (sections: ShortcutSection[]) => void
  setShortcutActiveContext: (context: string | null) => void
  studyType: StudyType
  setStudyType: (type: StudyType) => void
  dynamicPanel: DynamicPanelConfig | null
  openDynamicPanel: (panelId: string, config: DynamicPanelConfig) => void
  updateDynamicPanel: (config: DynamicPanelConfig) => void
  isMobileModalOpen: boolean
  setMobileModalOpen: (open: boolean) => void
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

  const pageActionsRef = useRef<ActionButton[]>([])

  const registerPageActions = useCallback((actions: ActionButton[], autoOpenPanelId?: string) => {
    if (pageActionsRef.current === actions) return

    pageActionsRef.current = actions
    setPageActions(actions)
    if (autoOpenPanelId) {
      setActivePanel(autoOpenPanelId)
    }
  }, [])

  const clearPageActions = useCallback(() => {
    pageActionsRef.current = []
    setPageActions([])
    setActivePanel((current) => {
      if (current === 'knowledge' || current === 'shortcuts') return current
      setDynamicPanel(null)
      return null
    })
  }, [])

  const addPageAction = useCallback((action: ActionButton) => {
    setPageActions((current) => {
      if (current.some(a => a.id === action.id)) {
        const updated = current.map(a => a.id === action.id ? action : a)
        pageActionsRef.current = updated
        return updated
      }
      const updated = [...current, action]
      pageActionsRef.current = updated
      return updated
    })
  }, [])

  const removePageAction = useCallback((actionId: string) => {
    setPageActions((current) => {
      const updated = current.filter(a => a.id !== actionId)
      pageActionsRef.current = updated
      return updated
    })
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

  const openDynamicPanel = useCallback((panelId: string, config: DynamicPanelConfig) => {
    setDynamicPanel(config)
    setActivePanel(panelId)
  }, [])

  const updateDynamicPanel = useCallback((config: DynamicPanelConfig) => {
    setDynamicPanel(config)
  }, [])

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
    shortcutActiveContext,
    setShortcutSections,
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
