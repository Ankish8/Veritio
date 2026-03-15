'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useDebouncedEmit } from './use-debounced-emit'
import { Plus, X, ChevronRight, ChevronDown, FolderOpen, FileText, Pencil } from 'lucide-react'

interface DraftTreeNode {
  tempId: string
  label: string
  parentTempId?: string
}

/** Raw node shape from AI tool args (snake_case) or handler result (camelCase) */
interface RawNode {
  temp_id?: string
  tempId?: string
  label?: string
  parent_temp_id?: string
  parentTempId?: string
}

/** Normalize a node from either snake_case (streaming) or camelCase (handler result) */
function normalizeNode(raw: RawNode, index: number): DraftTreeNode {
  return {
    tempId: raw.tempId || raw.temp_id || `node_${index}`,
    label: String(raw.label || ''),
    parentTempId: raw.parentTempId || raw.parent_temp_id || undefined,
  }
}

/** Normalize an array of nodes from either format */
function normalizeNodes(raw: RawNode[] | undefined): DraftTreeNode[] {
  if (!raw || !Array.isArray(raw)) return []
  return raw.map((n, i) => normalizeNode(n, i))
}

interface DraftTreeEditorProps {
  nodes?: RawNode[]
  count?: number
  message?: string
  propStatus?: Record<string, 'streaming' | 'complete'>
  onStateChange?: (state: { nodes: DraftTreeNode[] }) => void
}

function SkeletonNode({ indent = 0 }: { indent?: number }) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2" style={{ paddingLeft: `${12 + indent * 20}px` }}>
      <div className="animate-pulse bg-muted rounded h-4 w-4 shrink-0" />
      <div className="animate-pulse bg-muted rounded h-4 flex-1 max-w-[60%]" />
    </div>
  )
}

function buildChildrenMap(nodes: DraftTreeNode[]): Map<string | undefined, DraftTreeNode[]> {
  const map = new Map<string | undefined, DraftTreeNode[]>()
  for (const node of nodes) {
    const parentKey = node.parentTempId || undefined
    if (!map.has(parentKey)) map.set(parentKey, [])
    map.get(parentKey)!.push(node)
  }
  return map
}

export function DraftTreeEditor({ nodes: rawInitialNodes, propStatus, onStateChange }: DraftTreeEditorProps) {
  const isStreaming = propStatus?.nodes === 'streaming'
  const [nodes, setNodes] = useState<DraftTreeNode[]>(() => normalizeNodes(rawInitialNodes))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const inputRef = useRef<HTMLInputElement | null>(null)

  const prevRawRef = useRef(rawInitialNodes)
  if (rawInitialNodes && rawInitialNodes !== prevRawRef.current) {
    prevRawRef.current = rawInitialNodes
    setNodes(normalizeNodes(rawInitialNodes))
  }

  const debouncedEmit = useDebouncedEmit<{ nodes: DraftTreeNode[] }>(onStateChange)

  const emitChange = useCallback(
    (updated: DraftTreeNode[]) => {
      debouncedEmit({ nodes: updated })
    },
    [debouncedEmit],
  )

  const handleEdit = useCallback(
    (tempId: string, value: string) => {
      setNodes((prev) => {
        const updated = prev.map((n) => (n.tempId === tempId ? { ...n, label: value } : n))
        emitChange(updated)
        return updated
      })
    },
    [emitChange],
  )

  const handleDelete = useCallback(
    (tempId: string) => {
      setNodes((prev) => {
        const toRemove = new Set<string>()
        toRemove.add(tempId)
        let changed = true
        while (changed) {
          changed = false
          for (const n of prev) {
            if (n.parentTempId && toRemove.has(n.parentTempId) && !toRemove.has(n.tempId)) {
              toRemove.add(n.tempId)
              changed = true
            }
          }
        }
        const updated = prev.filter((n) => !toRemove.has(n.tempId))
        emitChange(updated)
        return updated
      })
      if (editingId === tempId) setEditingId(null)
    },
    [emitChange, editingId],
  )

  const handleAddChild = useCallback(
    (parentTempId?: string) => {
      const newNode: DraftTreeNode = {
        tempId: crypto.randomUUID(),
        label: '',
        parentTempId,
      }
      setNodes((prev) => {
        const updated = [...prev, newNode]
        emitChange(updated)
        return updated
      })
      // Expand parent if collapsed
      if (parentTempId) {
        setCollapsed((prev) => {
          const next = new Set(prev)
          next.delete(parentTempId)
          return next
        })
      }
      setEditingId(newNode.tempId)
      setTimeout(() => inputRef.current?.focus(), 50)
    },
    [emitChange],
  )

  const toggleCollapse = useCallback((tempId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(tempId)) next.delete(tempId)
      else next.add(tempId)
      return next
    })
  }, [])

  const startEditing = useCallback((tempId: string) => {
    setEditingId(tempId)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const stopEditing = useCallback(() => {
    setEditingId(null)
  }, [])

  const hasNodes = nodes.length > 0
  const childrenMap = useMemo(() => buildChildrenMap(nodes), [nodes])

  // Count descendants for a node
  const countDescendants = useCallback((tempId: string): number => {
    const children = childrenMap.get(tempId) ?? []
    let count = children.length
    for (const child of children) {
      count += countDescendants(child.tempId) // eslint-disable-line react-hooks/immutability
    }
    return count
  }, [childrenMap])

  function renderLevel(parentTempId: string | undefined, level: number, rendered: Set<string>) {
    if (level > 10) return null
    const children = childrenMap.get(parentTempId) ?? []
    if (children.length === 0) return null

    return (
      <>
        {children.map((node, index) => {
          if (rendered.has(node.tempId)) return null
          rendered.add(node.tempId)

          const hasChildren = childrenMap.has(node.tempId)
          const isCollapsed = collapsed.has(node.tempId)
          const isEditing = editingId === node.tempId
          const isLastStreaming = index === children.length - 1 && !hasChildren && isStreaming
          const descendantCount = hasChildren ? countDescendants(node.tempId) : 0

          return (
            <div key={node.tempId}>
              <div
                className={cn(
                  'group flex items-center gap-1 rounded-md transition-colors',
                  'hover:bg-accent/50',
                  isEditing && 'bg-accent/30',
                  isLastStreaming && 'animate-pulse',
                )}
                style={{ paddingLeft: `${4 + level * 20}px` }}
              >
                {/* Collapse toggle */}
                {hasChildren ? (
                  <button
                    type="button"
                    className="p-0.5 rounded hover:bg-accent text-muted-foreground shrink-0"
                    onClick={() => toggleCollapse(node.tempId)}
                  >
                    {isCollapsed
                      ? <ChevronRight className="h-3.5 w-3.5" />
                      : <ChevronDown className="h-3.5 w-3.5" />
                    }
                  </button>
                ) : (
                  <span className="w-[18px] shrink-0" />
                )}

                {/* Icon */}
                {hasChildren ? (
                  <FolderOpen className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                )}

                {/* Label */}
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    className="flex-1 text-sm bg-transparent border-b border-primary outline-none py-1 min-w-0"
                    value={node.label}
                    onChange={(e) => handleEdit(node.tempId, e.target.value)}
                    onBlur={stopEditing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') stopEditing()
                      if (e.key === 'Escape') stopEditing()
                    }}
                    placeholder="Node label..."
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    className={cn(
                      'flex-1 text-sm text-left py-1 min-w-0 truncate',
                      hasChildren ? 'font-medium text-foreground' : 'text-foreground/80',
                      'hover:text-foreground cursor-text',
                    )}
                    onClick={() => startEditing(node.tempId)}
                  >
                    {node.label || <span className="text-muted-foreground italic">Untitled</span>}
                  </button>
                )}

                {/* Collapsed badge */}
                {hasChildren && isCollapsed && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
                    {descendantCount}
                  </span>
                )}

                {/* Actions — visible on hover */}
                {!isStreaming && !isEditing && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pr-1">
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      onClick={() => startEditing(node.tempId)}
                      title="Edit label"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      onClick={() => handleAddChild(node.tempId)}
                      title="Add child node"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(node.tempId)}
                      title="Remove node and children"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Children */}
              {hasChildren && !isCollapsed && renderLevel(node.tempId, level + 1, rendered)}
            </div>
          )
        })}
      </>
    )
  }

  // Count root and total depth for summary
  const rootCount = (childrenMap.get(undefined) ?? []).length
  const maxDepth = useMemo(() => {
    let max = 0
    function walk(parentId: string | undefined, depth: number) {
      const kids = childrenMap.get(parentId) ?? []
      if (kids.length === 0) { max = Math.max(max, depth); return }
      for (const k of kids) walk(k.tempId, depth + 1)
    }
    walk(undefined, 0)
    return max
  }, [childrenMap])

  return (
    <div className="p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            Tree Structure
          </span>
          {hasNodes && (
            <span className="text-xs text-muted-foreground">
              {nodes.length} node{nodes.length === 1 ? '' : 's'} &middot; {rootCount} top-level &middot; {maxDepth} level{maxDepth === 1 ? '' : 's'} deep
            </span>
          )}
        </div>
        {isStreaming && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary animate-pulse">
            generating...
          </span>
        )}
      </div>

      {/* Skeleton during initial stream */}
      {!hasNodes && isStreaming && (
        <div className="rounded-lg border border-border bg-muted/10 py-2">
          <SkeletonNode indent={0} />
          <SkeletonNode indent={1} />
          <SkeletonNode indent={2} />
          <SkeletonNode indent={2} />
          <SkeletonNode indent={1} />
          <SkeletonNode indent={0} />
          <SkeletonNode indent={1} />
        </div>
      )}

      {/* Tree content */}
      {hasNodes && (
        <div className="rounded-lg border border-border bg-background py-1">
          {renderLevel(undefined, 0, new Set<string>())}
        </div>
      )}

      {/* Hint text */}
      {hasNodes && !isStreaming && (
        <p className="text-[11px] text-muted-foreground mt-1.5 px-1">
          Click a label to edit. Hover for actions.
        </p>
      )}

      {/* Add root node */}
      {!isStreaming && (
        <button
          type="button"
          className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-2 rounded-lg border border-dashed border-border hover:border-foreground/30 hover:bg-accent/30"
          onClick={() => handleAddChild(undefined)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add root node
        </button>
      )}
    </div>
  )
}
