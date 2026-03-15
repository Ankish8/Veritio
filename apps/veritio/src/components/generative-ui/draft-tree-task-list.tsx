'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useDebouncedEmit } from './use-debounced-emit'
import { Plus, X, Pencil, Check, ChevronDown, AlertCircle } from 'lucide-react'

interface DraftTreeTask {
  tempId: string
  question: string
  correctNodeTempId?: string
}

interface TreeNodeRef {
  tempId: string
  label: string
  parentTempId?: string
}

/** Raw task shape from AI tool args (snake_case) or handler result (camelCase) */
interface RawTask {
  temp_id?: string
  tempId?: string
  question?: string
  correct_node_temp_id?: string
  correctNodeTempId?: string
}

interface RawNode {
  temp_id?: string
  tempId?: string
  label?: string
  parent_temp_id?: string
  parentTempId?: string
}

function normalizeTask(raw: RawTask, index: number): DraftTreeTask {
  return {
    tempId: raw.tempId || raw.temp_id || `task_${index}`,
    question: String(raw.question || ''),
    correctNodeTempId: raw.correctNodeTempId || raw.correct_node_temp_id || undefined,
  }
}

function normalizeTasks(raw: RawTask[] | undefined): DraftTreeTask[] {
  if (!raw || !Array.isArray(raw)) return []
  return raw.map((t, i) => normalizeTask(t, i))
}

function normalizeNode(raw: RawNode, index: number): TreeNodeRef {
  return {
    tempId: raw.tempId || raw.temp_id || `node_${index}`,
    label: String(raw.label || ''),
    parentTempId: raw.parentTempId || raw.parent_temp_id || undefined,
  }
}

function normalizeNodes(raw: RawNode[] | undefined): TreeNodeRef[] {
  if (!raw || !Array.isArray(raw)) return []
  return raw.map((n, i) => normalizeNode(n, i))
}

/** Build indentation level for each node */
function buildNodeDepths(nodes: TreeNodeRef[]): Map<string, number> {
  const depthMap = new Map<string, number>()
  const nodeMap = new Map(nodes.map(n => [n.tempId, n]))

  function getDepth(tempId: string, visited = new Set<string>()): number {
    if (depthMap.has(tempId)) return depthMap.get(tempId)!
    if (visited.has(tempId)) return 0 // cycle guard
    visited.add(tempId)

    const node = nodeMap.get(tempId)
    if (!node || !node.parentTempId) {
      depthMap.set(tempId, 0)
      return 0
    }
    const parentDepth = getDepth(node.parentTempId, visited)
    const depth = parentDepth + 1
    depthMap.set(tempId, depth)
    return depth
  }

  for (const node of nodes) getDepth(node.tempId)
  return depthMap
}

interface DraftTreeTaskListProps {
  tasks?: RawTask[]
  treeNodes?: RawNode[]
  count?: number
  message?: string
  propStatus?: Record<string, 'streaming' | 'complete'>
  onStateChange?: (state: { tasks: DraftTreeTask[] }) => void
}

function SkeletonItem() {
  return (
    <div className="animate-pulse flex items-start gap-3 px-3 py-3">
      <div className="bg-muted rounded-full h-6 w-6 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1.5">
        <div className="bg-muted rounded h-4 w-4/5" />
        <div className="bg-muted rounded h-3 w-2/5" />
      </div>
    </div>
  )
}

/** Dropdown to pick a correct answer node from the tree */
function NodePicker({
  value,
  nodes,
  nodeDepths,
  onChange,
  disabled,
}: {
  value?: string
  nodes: TreeNodeRef[]
  nodeDepths: Map<string, number>
  onChange: (tempId: string | undefined) => void
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  const selectedNode = nodes.find(n => n.tempId === value)

  // Position dropdown using fixed positioning to escape overflow clipping
  const handleToggle = useCallback(() => {
    if (disabled) return
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const openUp = spaceBelow < 200 && spaceAbove > spaceBelow

      setDropdownStyle({
        position: 'fixed' as const,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      })
    }
    setIsOpen(prev => !prev)
  }, [disabled, isOpen])

  // Close on outside click or scroll
  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (
        buttonRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return
      setIsOpen(false)
    }
    function handleScroll(e: Event) {
      // Don't close if scrolling inside the dropdown itself
      if (dropdownRef.current?.contains(e.target as Node)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen])

  if (nodes.length === 0) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5">
        <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
        <span className="text-xs text-muted-foreground italic">No tree nodes available</span>
      </div>
    )
  }

  return (
    <div className="relative mt-1.5">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        className={cn(
          'flex items-center gap-1.5 text-xs rounded-md px-2 py-1 transition-colors w-full text-left',
          selectedNode
            ? 'bg-muted/50 text-foreground border border-border'
            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
          !disabled && 'hover:bg-accent/50 cursor-pointer',
          disabled && 'opacity-60 cursor-not-allowed',
        )}
        onClick={handleToggle}
      >
        {selectedNode ? (
          <>
            <Check className="h-3 w-3 shrink-0" />
            <span className="flex-1 truncate font-medium">{selectedNode.label || selectedNode.tempId}</span>
          </>
        ) : (
          <>
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span className="flex-1 italic">Select correct answer...</span>
          </>
        )}
        <ChevronDown className={cn('h-3 w-3 shrink-0 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="rounded-md border border-border bg-popover shadow-md max-h-52 overflow-y-auto"
          style={dropdownStyle}
        >
          {/* Clear option */}
          {selectedNode && (
            <button
              type="button"
              className="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 transition-colors border-b border-border"
              onClick={() => { onChange(undefined); setIsOpen(false) }}
            >
              Clear selection
            </button>
          )}
          {nodes.map((node) => {
            const depth = nodeDepths.get(node.tempId) ?? 0
            const isSelected = node.tempId === value
            return (
              <button
                key={node.tempId}
                type="button"
                className={cn(
                  'w-full text-left py-1.5 pr-2 text-xs hover:bg-accent/50 transition-colors flex items-center gap-1.5',
                  isSelected && 'bg-accent/30 font-medium',
                )}
                style={{ paddingLeft: `${8 + depth * 12}px` }}
                onClick={() => { onChange(node.tempId); setIsOpen(false) }}
              >
                {isSelected && <Check className="h-3 w-3 text-foreground shrink-0" />}
                <span className="truncate">{node.label || node.tempId}</span>
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </div>
  )
}

export function DraftTreeTaskList({ tasks: rawInitialTasks, treeNodes: rawTreeNodes, propStatus, onStateChange }: DraftTreeTaskListProps) {
  const isStreaming = propStatus?.tasks === 'streaming'
  const [tasks, setTasks] = useState<DraftTreeTask[]>(() => normalizeTasks(rawInitialTasks))
  const [editingId, setEditingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const treeNodes = useMemo(() => normalizeNodes(rawTreeNodes), [rawTreeNodes])
  const nodeDepths = useMemo(() => buildNodeDepths(treeNodes), [treeNodes])

  const prevRawRef = useRef(rawInitialTasks)
  // eslint-disable-next-line react-hooks/refs
  if (rawInitialTasks && rawInitialTasks !== prevRawRef.current) {
    // eslint-disable-next-line react-hooks/refs
    prevRawRef.current = rawInitialTasks
    setTasks(normalizeTasks(rawInitialTasks))
  }

  const debouncedEmit = useDebouncedEmit<{ tasks: DraftTreeTask[] }>(onStateChange)

  const emitChange = useCallback(
    (updated: DraftTreeTask[]) => {
      debouncedEmit({ tasks: updated })
    },
    [debouncedEmit],
  )

  const handleEdit = useCallback(
    (tempId: string, value: string) => {
      setTasks((prev) => {
        const updated = prev.map((t) => (t.tempId === tempId ? { ...t, question: value } : t))
        emitChange(updated)
        return updated
      })
    },
    [emitChange],
  )

  const handleSetCorrectNode = useCallback(
    (taskTempId: string, nodeTempId: string | undefined) => {
      setTasks((prev) => {
        const updated = prev.map((t) =>
          t.tempId === taskTempId ? { ...t, correctNodeTempId: nodeTempId } : t,
        )
        emitChange(updated)
        return updated
      })
    },
    [emitChange],
  )

  const handleDelete = useCallback(
    (tempId: string) => {
      setTasks((prev) => {
        const updated = prev.filter((t) => t.tempId !== tempId)
        emitChange(updated)
        return updated
      })
      if (editingId === tempId) setEditingId(null)
    },
    [emitChange, editingId],
  )

  const handleAdd = useCallback(() => {
    const newTask: DraftTreeTask = {
      tempId: crypto.randomUUID(),
      question: '',
    }
    setTasks((prev) => {
      const updated = [...prev, newTask]
      emitChange(updated)
      return updated
    })
    setEditingId(newTask.tempId)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [emitChange])

  const startEditing = useCallback((tempId: string) => {
    setEditingId(tempId)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const stopEditing = useCallback(() => {
    setEditingId(null)
  }, [])

  const hasTasks = tasks.length > 0
  const missingAnswers = tasks.filter(t => !t.correctNodeTempId).length

  return (
    <div className="p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            Tree Test Tasks
          </span>
          {hasTasks && (
            <span className="text-xs text-muted-foreground">
              {tasks.length} task{tasks.length === 1 ? '' : 's'}
            </span>
          )}
          {hasTasks && !isStreaming && missingAnswers > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              {missingAnswers} missing answer{missingAnswers === 1 ? '' : 's'}
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
      {!hasTasks && isStreaming && (
        <div className="rounded-lg border border-border divide-y divide-border">
          <SkeletonItem />
          <SkeletonItem />
          <SkeletonItem />
        </div>
      )}

      {/* Task list */}
      {hasTasks && (
        <div className="rounded-lg border border-border divide-y divide-border">
          {tasks.map((task, index) => {
            const isLast = index === tasks.length - 1
            const isPulsing = isLast && isStreaming
            const isEditing = editingId === task.tempId

            return (
              <div
                key={task.tempId || `task-${index}`}
                className={cn(
                  'group relative bg-background transition-colors hover:bg-accent/30',
                  isPulsing && 'animate-pulse',
                  isEditing && 'bg-accent/20',
                )}
              >
                <div className="flex items-start gap-3 px-3 py-2.5">
                  {/* Task number badge */}
                  <div className={cn(
                    'flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium shrink-0 mt-0.5',
                    'bg-primary/10 text-primary',
                  )}>
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Question */}
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        type="text"
                        className="w-full text-sm bg-transparent border-b border-primary outline-none py-0.5"
                        value={task.question}
                        onChange={(e) => handleEdit(task.tempId, e.target.value)}
                        onBlur={stopEditing}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') stopEditing()
                          if (e.key === 'Escape') stopEditing()
                        }}
                        placeholder="Where would participants find...?"
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        className="text-sm text-foreground/80 hover:text-foreground cursor-text text-left w-full leading-snug"
                        onClick={() => startEditing(task.tempId)}
                      >
                        {task.question || <span className="text-muted-foreground italic">Click to add task question...</span>}
                      </button>
                    )}

                    {/* Correct answer node picker */}
                    {!isStreaming && (
                      <NodePicker
                        value={task.correctNodeTempId}
                        nodes={treeNodes}
                        nodeDepths={nodeDepths}
                        onChange={(nodeTempId) => handleSetCorrectNode(task.tempId, nodeTempId)}
                      />
                    )}
                  </div>

                  {/* Actions */}
                  {!isStreaming && !isEditing && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                        onClick={() => startEditing(task.tempId)}
                        title="Edit question"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(task.tempId)}
                        title="Remove task"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {isStreaming && <SkeletonItem />}
        </div>
      )}

      {/* Hint */}
      {hasTasks && !isStreaming && (
        <p className="text-[11px] text-muted-foreground mt-1.5 px-1">
          Click a question to edit. Select the correct answer node for each task.
        </p>
      )}

      {/* Add task */}
      {!isStreaming && (
        <button
          type="button"
          className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-2 rounded-lg border border-dashed border-border hover:border-foreground/30 hover:bg-accent/30"
          onClick={handleAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          Add task
        </button>
      )}
    </div>
  )
}
