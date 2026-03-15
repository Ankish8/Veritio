'use client'

import { useState, useRef, useCallback, ReactNode } from 'react'
import { useFloatingActionBar } from '@veritio/analysis-shared/components/floating-action-bar'
import type { DialogHandlers } from '@veritio/analysis-shared'

export interface UseParticipantDetailPanelOptions {
  onPanelClosed?: () => void
}

export interface PanelRenderState<T> {
  row: T
  handlers: DialogHandlers
}

export interface UseParticipantDetailPanelReturn<T> {
  renderDetailDialog: (row: T | null, index: number, handlers: DialogHandlers) => null
  setPanelContent: (content: ReactNode) => void
  panelState: PanelRenderState<T> | null
  closePanel: () => void
  isOpen: boolean
}

export function useParticipantDetailPanel<T>(
  options: UseParticipantDetailPanelOptions = {}
): UseParticipantDetailPanelReturn<T> {
  const { onPanelClosed } = options
  const { openDynamicPanel, closePanel: closeFabPanel } = useFloatingActionBar()

  const [panelState, setPanelState] = useState<PanelRenderState<T> | null>(null)
  const isClosingRef = useRef(false)
  const prevRowIdRef = useRef<string | null>(null)

  const closePanel = useCallback(() => {
    if (isClosingRef.current) return
    isClosingRef.current = true

    closeFabPanel()
    setPanelState(null)
    onPanelClosed?.()

    setTimeout(() => {
      isClosingRef.current = false
    }, 0)
  }, [closeFabPanel, onPanelClosed])

  const setPanelContent = useCallback((content: ReactNode) => {
    openDynamicPanel('participant-detail', {
      content,
      width: 'wide',
      hideHeader: true,
    })
  }, [openDynamicPanel])

  const renderDetailDialog = useCallback(
    (row: T | null, _index: number, handlers: DialogHandlers): null => {
      const getRowId = (r: T | null): string | null => {
        if (!r) return null
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

      if (newRowId !== prevRowIdRef.current && !isClosingRef.current) {
        prevRowIdRef.current = newRowId

        queueMicrotask(() => {
          if (row) {
            setPanelState({ row, handlers })
          } else {
            setPanelState(null)
            closeFabPanel()
          }
        })
      }

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
