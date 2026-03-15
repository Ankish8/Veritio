'use client'

import { useEffect, useRef, useMemo, useCallback } from 'react'
import { Sliders } from 'lucide-react'
import { useFloatingActionBar, type ActionButton } from '../components/analysis/shared/floating-action-bar'
import { HeatmapSettingsPanel, SelectionSettingsPanel } from '../components/analysis/shared/click-maps/settings'
import { DEFAULT_SELECTION_SETTINGS } from '../types/analytics'
import type { HeatmapSettings, SelectionSettings, ClickDisplayMode } from '../types/analytics'

interface UseClickMapsPanelsOptions {
  /** Whether the Click Maps tab is currently active */
  isActive: boolean
  /** Current display mode - determines which settings panel to show (defaults to 'heatmap') */
  displayMode?: Exclude<ClickDisplayMode, 'grid'>
  /** Current heatmap settings */
  heatmapSettings: HeatmapSettings
  /** Callback to update heatmap settings */
  onHeatmapSettingsChange: (updates: Partial<HeatmapSettings>) => void
  /** Callback to reset heatmap settings to defaults */
  onResetHeatmapSettings: () => void
  /** Current selection settings (optional - only needed if displayMode can be 'selection') */
  selectionSettings?: SelectionSettings
  /** Callback to update selection settings (optional) */
  onSelectionSettingsChange?: (updates: Partial<SelectionSettings>) => void
  /** Callback to reset selection settings to defaults (optional) */
  onResetSelectionSettings?: () => void
  /** Whether hit/miss data is available (affects UI) */
  hasHitMissData?: boolean
}

const HEATMAP_PANEL_ID = 'heatmap-settings'
const SELECTION_PANEL_ID = 'selection-settings'

export function useClickMapsPanels({
  isActive,
  displayMode = 'heatmap',
  heatmapSettings,
  onHeatmapSettingsChange,
  onResetHeatmapSettings,
  selectionSettings = DEFAULT_SELECTION_SETTINGS,
  onSelectionSettingsChange = () => {},
  onResetSelectionSettings = () => {},
  hasHitMissData = true,
}: UseClickMapsPanelsOptions) {
  const { addPageAction, removePageAction, setActivePanel, closePanel, activePanel } = useFloatingActionBar()
  const hasRegisteredRef = useRef(false)
  const previousModeRef = useRef<typeof displayMode | null>(null)

  const currentPanelId = displayMode === 'heatmap' ? HEATMAP_PANEL_ID : SELECTION_PANEL_ID
  const otherPanelId = displayMode === 'heatmap' ? SELECTION_PANEL_ID : HEATMAP_PANEL_ID

  const heatmapPanelContent = useMemo(
    () => (
      <HeatmapSettingsPanel
        settings={heatmapSettings}
        onSettingsChange={onHeatmapSettingsChange}
        onReset={onResetHeatmapSettings}
        hasHitMissData={hasHitMissData}
      />
    ),
    [heatmapSettings, onHeatmapSettingsChange, onResetHeatmapSettings, hasHitMissData]
  )

  const selectionPanelContent = useMemo(
    () => (
      <SelectionSettingsPanel
        settings={selectionSettings}
        onSettingsChange={onSelectionSettingsChange}
        onReset={onResetSelectionSettings}
        hasHitMissData={hasHitMissData}
      />
    ),
    [selectionSettings, onSelectionSettingsChange, onResetSelectionSettings, hasHitMissData]
  )

  const heatmapSettingsAction: ActionButton = useMemo(
    () => ({
      id: HEATMAP_PANEL_ID,
      icon: Sliders,
      tooltip: 'Heatmap Settings',
      panelTitle: 'Heatmap Settings',
      panelContent: heatmapPanelContent,
      panelWidth: 'default',
    }),
    [heatmapPanelContent]
  )

  const selectionSettingsAction: ActionButton = useMemo(
    () => ({
      id: SELECTION_PANEL_ID,
      icon: Sliders,
      tooltip: 'Selection Settings',
      panelTitle: 'Selection Settings',
      panelContent: selectionPanelContent,
      panelWidth: 'default',
    }),
    [selectionPanelContent]
  )

  const currentAction = displayMode === 'heatmap' ? heatmapSettingsAction : selectionSettingsAction

  useEffect(() => {
    if (isActive && !hasRegisteredRef.current) {
      addPageAction(currentAction)
      hasRegisteredRef.current = true
      previousModeRef.current = displayMode

      const timer = setTimeout(() => {
        setActivePanel(currentPanelId)
      }, 100)

      return () => clearTimeout(timer)
    } else if (!isActive && hasRegisteredRef.current) {
      if (activePanel === HEATMAP_PANEL_ID || activePanel === SELECTION_PANEL_ID) {
        closePanel()
      }
      removePageAction(HEATMAP_PANEL_ID)
      removePageAction(SELECTION_PANEL_ID)
      hasRegisteredRef.current = false
      previousModeRef.current = null
    }
  }, [isActive, currentAction, currentPanelId, addPageAction, removePageAction, setActivePanel, activePanel, closePanel, displayMode])

  useEffect(() => {
    if (!isActive || !hasRegisteredRef.current) return
    if (previousModeRef.current === displayMode) return

    const wasOtherPanelOpen = activePanel === otherPanelId
    removePageAction(otherPanelId)
    addPageAction(currentAction)

    if (wasOtherPanelOpen) {
      setActivePanel(currentPanelId)
    }

    previousModeRef.current = displayMode
  }, [displayMode, isActive, currentAction, currentPanelId, otherPanelId, activePanel, addPageAction, removePageAction, setActivePanel])

  useEffect(() => {
    if (isActive && hasRegisteredRef.current) {
      addPageAction(currentAction)
    }
  }, [isActive, currentAction, addPageAction])

  useEffect(() => {
    return () => {
      if (hasRegisteredRef.current) {
        removePageAction(HEATMAP_PANEL_ID)
        removePageAction(SELECTION_PANEL_ID)
        hasRegisteredRef.current = false
      }
    }
  }, [removePageAction])

  const togglePanel = useCallback(() => {
    if (activePanel === currentPanelId) {
      closePanel()
    } else {
      setActivePanel(currentPanelId)
    }
  }, [activePanel, currentPanelId, closePanel, setActivePanel])

  return {
    togglePanel,
    isPanelOpen: activePanel === currentPanelId,
    currentPanelId,
  }
}
