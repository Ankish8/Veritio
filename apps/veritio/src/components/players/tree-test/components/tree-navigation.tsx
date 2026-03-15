'use client'

import { memo, useMemo } from 'react'
import { ChevronRight, ChevronDown, Folder } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandedButton } from '@/components/study-flow/player/step-layout'
import type { TreeNavigationProps } from '../types'
import type { TreeNode } from '@veritio/study-types'

interface TreeNodeRowProps {
  node: TreeNode
  depth: number
  isSelected: boolean
  nodeHasChildren: boolean
  nodeIsExpanded: boolean
  answerButtonText?: string
  onNodeToggle: (id: string) => void
  onNodeSelect: (id: string) => void
  onConfirmAnswer: () => void
  children?: React.ReactNode
}

// Wrapped in memo — only re-renders when its own props change.
// Without this, every expand/collapse (new expandedNodeIds array) re-renders the entire tree.
const TreeNodeRow = memo(function TreeNodeRow({
  node,
  depth,
  isSelected,
  nodeHasChildren,
  nodeIsExpanded,
  answerButtonText,
  onNodeToggle,
  onNodeSelect,
  onConfirmAnswer,
  children,
}: TreeNodeRowProps) {
  return (
    <div>
      {/* group/node lets children use group-hover/node: utilities for hover-driven styles */}
      <div
        className={cn(
          'last:border-b-0 cursor-pointer transition-colors group/node',
          // Selected background takes priority; otherwise show hover tint via CSS only (no useState)
          isSelected ? 'bg-[var(--brand-subtle)]' : 'hover:bg-black/[.04]'
        )}
        style={{ borderBottom: '1px solid var(--style-border-muted)' }}
        onClick={() => {
          if (nodeHasChildren) {
            onNodeToggle(node.id)
          } else {
            onNodeSelect(node.id)
          }
        }}
      >
        <div
          className="flex items-center gap-2 py-3 pr-4"
          style={{ paddingLeft: `${depth * 20 + 16}px` }}
        >
          {nodeHasChildren ? (
            <>
              {/* Chevron for folders */}
              <span className="flex items-center justify-center w-5 h-5 shrink-0">
                {nodeIsExpanded ? (
                  <ChevronDown className="h-4 w-4" style={{ color: 'var(--style-text-secondary)' }} />
                ) : (
                  <ChevronRight className="h-4 w-4" style={{ color: 'var(--style-text-muted)' }} />
                )}
              </span>

              {/* Folder icon */}
              <Folder
                className="h-4 w-4 shrink-0"
                style={{ color: nodeIsExpanded ? 'var(--brand)' : 'var(--brand-muted)' }}
              />

              {/* Label */}
              <span
                className="font-medium truncate flex-1"
                style={{ color: 'var(--style-text-primary)' }}
              >
                {node.label}
              </span>
            </>
          ) : (
            <>
              {/* Spacer to align with chevron */}
              <span className="w-5 shrink-0" />

              {/* Radio-style selection indicator — border color via CSS group-hover, no JS state */}
              <span
                className={cn(
                  'flex items-center justify-center w-4 h-4 rounded-full shrink-0 transition-all',
                  isSelected
                    ? 'border-2 border-[var(--brand)] bg-[var(--brand)]'
                    : 'border-2 border-[var(--style-border-muted)] bg-transparent group-hover/node:border-[var(--brand-muted)]'
                )}
              >
                {isSelected && (
                  <span
                    className="block w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: 'white' }}
                  />
                )}
              </span>

              {/* Label — color via CSS group-hover, no JS state */}
              <span
                className={cn(
                  'font-medium truncate flex-1 transition-colors',
                  isSelected
                    ? 'text-[var(--style-text-primary)]'
                    : 'text-[var(--style-text-secondary)] group-hover/node:text-[var(--style-text-primary)]'
                )}
              >
                {node.label}
              </span>

              {/* Confirm button — visible only after selecting */}
              {/* Wrapping span stops click propagation so the row's toggle handler isn't also fired */}
              {isSelected && (
                <span onClick={(e) => e.stopPropagation()}>
                  <BrandedButton onClick={onConfirmAnswer} size="sm">
                    {answerButtonText || "I'd find it here"}
                  </BrandedButton>
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Render children if expanded */}
      {children}
    </div>
  )
})

export function TreeNavigation({
  nodes,
  expandedNodeIds,
  selectedNodeId,
  answerButtonText,
  onNodeToggle,
  onNodeSelect,
  onConfirmAnswer,
}: TreeNavigationProps) {
  const childrenMap = useMemo(() => {
    const map = new Map<string | null, TreeNode[]>()
    for (const node of nodes) {
      const key = node.parent_id
      const list = map.get(key)
      if (list) {
        list.push(node)
      } else {
        map.set(key, [node])
      }
    }
    for (const children of map.values()) {
      children.sort((a, b) => a.position - b.position)
    }
    return map
  }, [nodes])

  const getChildren = (parentId: string | null): TreeNode[] => childrenMap.get(parentId) || []
  const hasChildren = (nodeId: string): boolean => childrenMap.has(nodeId)

  const expandedSet = useMemo(() => new Set(expandedNodeIds), [expandedNodeIds])
  const isExpanded = (nodeId: string): boolean => expandedSet.has(nodeId)

  const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
    const nodeHasChildren = hasChildren(node.id)
    const nodeIsExpanded = isExpanded(node.id)
    const isSelected = selectedNodeId === node.id
    const children = nodeHasChildren ? getChildren(node.id) : []

    return (
      <TreeNodeRow
        key={node.id}
        node={node}
        depth={depth}
        isSelected={isSelected}
        nodeHasChildren={nodeHasChildren}
        nodeIsExpanded={nodeIsExpanded}
        answerButtonText={answerButtonText}
        onNodeToggle={onNodeToggle}
        onNodeSelect={onNodeSelect}
        onConfirmAnswer={onConfirmAnswer}
      >
        {nodeHasChildren && nodeIsExpanded && (
          <div>
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </TreeNodeRow>
    )
  }

  const rootNodes = getChildren(null)

  return (
    <div
      className="overflow-hidden"
      style={{
        backgroundColor: 'var(--style-card-bg)',
        borderRadius: 'var(--style-radius-lg)',
        border: '1px solid var(--style-card-border)',
      }}
    >
      {rootNodes.length > 0 ? (
        rootNodes.map((node) => renderNode(node, 0))
      ) : (
        <div className="py-8 text-center" style={{ color: 'var(--style-text-secondary)' }}>
          No items available
        </div>
      )}
    </div>
  )
}
