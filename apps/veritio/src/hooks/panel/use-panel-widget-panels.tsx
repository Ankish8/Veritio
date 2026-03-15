'use client'

import { useEffect, useRef, useMemo, type ReactNode } from 'react'
import { Settings2 } from 'lucide-react'
import { useFloatingActionBar, type ActionButton } from '@/components/analysis/shared/floating-action-bar'

/** Registers and auto-opens the widget settings panel in the floating action bar.
 *  Auto-collapses when widget is disabled and re-opens when enabled. */
export function usePanelWidgetPanels(panelContent: ReactNode, enabled?: boolean) {
  const { registerPageActions, clearPageActions, setActivePanel } = useFloatingActionBar()
  const hasInitializedRef = useRef(false)
  const prevEnabledRef = useRef(enabled)

  const widgetSettingsAction = useMemo(
    (): ActionButton[] => [
      {
        id: 'panel-widget-settings',
        icon: Settings2,
        tooltip: 'Widget Settings',
        panelTitle: 'Widget Settings',
        panelContent,
        panelWidth: 300,
      },
    ],
    [panelContent]
  )

  useEffect(() => {
    registerPageActions(widgetSettingsAction)
  }, [widgetSettingsAction, registerPageActions])

  // Auto-open on first mount (only if enabled)
  useEffect(() => {
    if (!hasInitializedRef.current) {
      if (enabled !== false) {
        setActivePanel('panel-widget-settings')
      }
      hasInitializedRef.current = true
    }
  }, [setActivePanel, enabled])

  // Auto-collapse/expand when enabled state changes
  useEffect(() => {
    if (!hasInitializedRef.current) return
    const wasEnabled = prevEnabledRef.current
    prevEnabledRef.current = enabled

    if (wasEnabled !== enabled) {
      if (enabled) {
        setActivePanel('panel-widget-settings')
      } else {
        setActivePanel(null)
      }
    }
  }, [enabled, setActivePanel])

  useEffect(() => {
    return () => {
      hasInitializedRef.current = false
      clearPageActions()
    }
  }, [clearPageActions])
}
