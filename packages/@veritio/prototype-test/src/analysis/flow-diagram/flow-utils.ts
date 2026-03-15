/**
 * Flow Utilities
 *
 * Exported utility functions for filtering and path-checking
 * used by the UI components.
 */

import type {
  FlowNode,
  FlowLink,
  OptimalPath,
} from './types'
export function filterLinksByMinParticipants(
  links: FlowLink[],
  minParticipants: number
): FlowLink[] {
  return links.filter((l) => l.uniqueParticipants >= minParticipants)
}
export function getConnectedNodes(
  nodes: FlowNode[],
  links: FlowLink[]
): FlowNode[] {
  const connectedIds = new Set<string>()

  for (const link of links) {
    connectedIds.add(link.source)
    connectedIds.add(link.target)
  }

  return nodes.filter((n) => connectedIds.has(n.id))
}
export function isNodeOnPath(
  nodeId: string,
  path: OptimalPath | null,
  nodeMap?: Map<string, FlowNode>
): boolean {
  if (!path) return false
  const pathSet = new Set(path.nodeIds)

  if (pathSet.has(nodeId)) return true

  // Strip positional suffix (:pN) — positional variants of a path node are on the path
  const strippedId = nodeId.replace(/:p\d+$/, '')
  if (strippedId !== nodeId && pathSet.has(strippedId)) return true

  // Check if this is a state node whose parent frame is on the path
  if (nodeMap) {
    const node = nodeMap.get(nodeId)
    if (node?.type === 'state' && node.parentFrameId && pathSet.has(node.parentFrameId)) {
      return true
    }
  }

  return false
}
export function isLinkOnPath(
  source: string,
  target: string,
  path: OptimalPath | null,
  nodeMap?: Map<string, FlowNode>
): boolean {
  if (!path) return false
  const { nodeIds } = path
  const pathSet = new Set(nodeIds)

  // Strip positional suffixes (:pN) for matching
  const baseSource = source.replace(/:p\d+$/, '')
  const baseTarget = target.replace(/:p\d+$/, '')

  // Direct match: both source and target are consecutive in the path
  for (let i = 0; i < nodeIds.length - 1; i++) {
    if (nodeIds[i] === baseSource && nodeIds[i + 1] === baseTarget) {
      return true
    }
  }

  // If we have a node map, check state node pass-through.
  // A state node's parentFrameId links it to a path frame.
  if (nodeMap) {
    const srcNode = nodeMap.get(source)
    const tgtNode = nodeMap.get(target)

    // frame (on path) → state (parent frame on path) = highlighted
    if (pathSet.has(baseSource) && tgtNode?.type === 'state' && tgtNode.parentFrameId && pathSet.has(tgtNode.parentFrameId)) {
      return true
    }

    // state (parent frame on path) → frame (on path) = highlighted
    if (srcNode?.type === 'state' && srcNode.parentFrameId && pathSet.has(srcNode.parentFrameId) && pathSet.has(baseTarget)) {
      return true
    }
  }

  return false
}
