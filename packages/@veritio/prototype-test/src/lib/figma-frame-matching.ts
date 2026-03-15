/**
 * Figma Frame Matching Utilities
 *
 * Provides robust matching between Figma node IDs and our internal frame records.
 * Figma sends node IDs in various formats, so we implement multiple matching
 * strategies to ensure reliable frame identification.
 *
 * Used by both the prototype test player (for success detection) and
 * the pathway builder (for path recording).
 */
export interface FrameWithNodeId {
  id: string
  figma_node_id: string | null
}
export function findFrameByFigmaNodeId<T extends FrameWithNodeId>(
  frames: T[],
  nodeId: string
): T | undefined {
  if (!nodeId || !frames || frames.length === 0) return undefined

  // Strategy 1: Exact match
  let frame = frames.find((f) => f.figma_node_id === nodeId)
  if (frame) return frame

  // Strategy 2: Without "node" prefix (e.g., "node123:456" → "123:456")
  const cleanNodeId = nodeId.replace(/^node/, '')
  frame = frames.find((f) => f.figma_node_id === cleanNodeId)
  if (frame) return frame

  // Strategy 3: With "node" prefix (e.g., "123:456" → "node123:456")
  frame = frames.find((f) => f.figma_node_id === `node${nodeId}`)
  if (frame) return frame

  // Strategy 4: Match just the node ID part after colon
  // Figma node IDs are formatted as "pageId:nodeId" (e.g., "123:456")
  // Sometimes only the nodeId part matches
  const parts = nodeId.split(':')
  if (parts.length === 2) {
    const nodeIdPart = parts[1]
    frame = frames.find((f) => {
      if (!f.figma_node_id) return false
      const frameParts = f.figma_node_id.split(':')
      return frameParts.length === 2 && frameParts[1] === nodeIdPart
    })
    if (frame) return frame
  }

  return undefined
}
export function getFrameIdFromFigmaNodeId<T extends FrameWithNodeId>(
  frames: T[],
  nodeId: string
): string | null {
  const frame = findFrameByFigmaNodeId(frames, nodeId)
  return frame?.id ?? null
}
