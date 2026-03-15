/**
 * Hook for mapping between internal frame IDs and Figma node IDs.
 *
 * Provides bidirectional conversion utilities:
 * - getFrameIdFromNodeId: Figma node ID → Internal frame ID
 * - getFigmaNodeIdFromFrameId: Internal frame ID → Figma node ID
 *
 * Uses the shared frame matching utility for robust ID matching.
 */
import { useCallback } from 'react'
import { getFrameIdFromFigmaNodeId } from '../../lib/figma-frame-matching'

interface PrototypeFrame {
  id: string
  figma_node_id: string | null
}
export function useFigmaFrameMapping(frames: PrototypeFrame[]) {
  const getFrameIdFromNodeId = useCallback(
    (nodeId: string): string | null => {
      return getFrameIdFromFigmaNodeId(frames, nodeId)
    },
    [frames]
  )
  const getFigmaNodeIdFromFrameId = useCallback(
    (frameId: string | null | undefined): string | null => {
      if (!frameId) return null
      const frame = frames.find((f) => f.id === frameId)
      return frame?.figma_node_id ?? null
    },
    [frames]
  )

  return {
    getFrameIdFromNodeId,
    getFigmaNodeIdFromFrameId,
  }
}
