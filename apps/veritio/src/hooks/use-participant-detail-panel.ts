'use client'

import { useState, useRef, useCallback, ReactNode } from 'react'
import { useFloatingActionBar } from '@/components/analysis/shared/floating-action-bar'
import type { DialogHandlers } from '@/components/analysis/shared'

export interface UseParticipantDetailPanelOptions {
  /** Callback when panel is closed */
  onPanelClosed?: () => void
}

export interface PanelRenderState<T> {
  /** The current row data */
  row: T
  /** Dialog handlers for navigation, close, exclusion */
  handlers: DialogHandlers
}

export interface UseParticipantDetailPanelReturn<T> {
  renderDetailDialog: (row: T | null, index: number, handlers: DialogHandlers) => null
  setPanelContent: (content: ReactNode) => void
  panelState: PanelRenderState<T> | null
  closePanel: () => void
  isOpen: boolean
}

/** Manages participant detail panel state and lifecycle for FloatingActionBar integration. */
export function useParticipantDetailPanel<T>(
  options: UseParticipantDetailPanelOptions = {}
): UseParticipantDetailPanelReturn<T> {
  const { onPanelClosed } = options
  const { openDynamicPanel, closePanel: closeFabPanel } = useFloatingActionBar()

  // Track the selected participant for panel updates
  const [panelState, setPanelState] = useState<PanelRenderState<T> | null>(null)

  // Ref to track if panel is being closed to prevent race conditions
  const isClosingRef = useRef(false)

  // Track previous row ID to detect actual changes (not just re-renders)
  const prevRowIdRef = useRef<string | null>(null)

  // Close handler - stable reference that coordinates all state
  const closePanel = useCallback(() => {
    if (isClosingRef.current) return // Prevent double-close
    isClosingRef.current = true

    // Close the floating panel first
    closeFabPanel()
    // Then clear local state
    setPanelState(null)
    // Notify consumer
    onPanelClosed?.()

    // Reset closing flag after a tick
    setTimeout(() => {
      isClosingRef.current = false
    }, 0)
  }, [closeFabPanel, onPanelClosed])

  // Set panel content - opens the FloatingActionBar panel with the given content
  const setPanelContent = useCallback((content: ReactNode) => {
    openDynamicPanel('participant-detail', {
      content,
      width: 'wide', // 480px
      hideHeader: true, // ParticipantDetailPanel has its own header
    })
  }, [openDynamicPanel])

  const renderDetailDialog = useCallback(
    (row: T | null, _index: number, handlers: DialogHandlers): null => {
      // Get a unique ID for the row (assumes row has participant.id or id)
      const getRowId = (r: T | null): string | null => {
        if (!r) return null
        // Try common patterns for getting participant ID
        const rowAny = r as Record<string, unknown>
        if (rowAny.participant && typeof rowAny.participant === 'object') {
          const participant = rowAny.participant as Record<string, unknown>
          if (typeof participant.id === 'string') return participant.id
        }
        if (typeof rowAny.id === 'string') return rowAny.id
        if (typeof rowAny.participant_id === 'string') return rowAny.participant_id
        return null
      }

      const newRowId = getRowId(row)

      // Only update state if the row actually changed
      if (newRowId !== prevRowIdRef.current && !isClosingRef.current) {
        prevRowIdRef.current = newRowId

        // Use microtask to batch with React's updates
        queueMicrotask(() => {
          if (row) {
            setPanelState({ row, handlers })
          } else {
            // Row is null - close the panel entirely
            setPanelState(null)
            closeFabPanel()
          }
        })
      }

      // Return null - the panel is rendered by FloatingActionBarPanel
      return null
    },
    [closeFabPanel]
  )

  return {
    renderDetailDialog,
    setPanelContent,
    panelState,
    closePanel,
    isOpen: panelState !== null,
  }
}
