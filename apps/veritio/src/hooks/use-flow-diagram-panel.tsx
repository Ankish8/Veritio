'use client'

import { useCallback, useRef } from 'react'
import { useFloatingActionBar } from '../components/analysis/shared/floating-action-bar'
import { FlowNodeDetailContent } from '@veritio/prototype-test/analysis'
import type { FlowNode, FlowDiagramData } from '@veritio/prototype-test/analysis'

const PANEL_ID = 'flow-node-detail'

export function useFlowDiagramPanel() {
  const { openDynamicPanel, closePanel } = useFloatingActionBar()

  // Stable ref for the recursive onNodeSelect callback.
  // openNodeDetail updates this ref on every call so the JSX closure
  // inside FlowNodeDetailContent always reaches the latest version.
  const openRef = useRef<(node: FlowNode, data: FlowDiagramData) => void>(() => {})
  const dataRef = useRef<FlowDiagramData | null>(null)
  const closePanelRef = useRef(closePanel)
  // eslint-disable-next-line react-hooks/refs
  closePanelRef.current = closePanel

  const openNodeDetail = useCallback((node: FlowNode, data: FlowDiagramData) => {
    dataRef.current = data

    const content = (
      <FlowNodeDetailContent
        node={node}
        data={data}
        onNodeSelect={(selectedNode) => {
          if (dataRef.current) {
            openRef.current(selectedNode, dataRef.current)
          }
        }}
        onClose={() => closePanelRef.current()}
      />
    )

    openDynamicPanel(PANEL_ID, {
      content,
      hideHeader: true,
      width: 'default',
    })
  }, [openDynamicPanel])

  // Keep ref in sync so recursive calls from transition rows work
  // eslint-disable-next-line react-hooks/refs
  openRef.current = openNodeDetail

  return { openNodeDetail }
}
