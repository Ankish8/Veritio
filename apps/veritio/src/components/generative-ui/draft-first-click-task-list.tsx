'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useDebouncedEmit } from './use-debounced-emit'
import { Plus, X, ImageIcon } from 'lucide-react'

interface DraftFirstClickTask {
  tempId: string
  instruction: string
  imageUrl?: string
}

interface DraftFirstClickTaskListProps {
  tasks?: DraftFirstClickTask[]
  count?: number
  message?: string
  propStatus?: Record<string, 'streaming' | 'complete'>
  onStateChange?: (state: { tasks: DraftFirstClickTask[] }) => void
}

function SkeletonItem() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <div className="bg-muted rounded h-10 w-10 shrink-0" />
        <div className="flex-1">
          <div className="bg-muted rounded h-4 w-3/4 mb-1.5" />
          <div className="bg-muted rounded h-3 w-1/2" />
        </div>
      </div>
    </div>
  )
}

export function DraftFirstClickTaskList({ tasks: initialTasks, propStatus, onStateChange }: DraftFirstClickTaskListProps) {
  const isStreaming = propStatus?.tasks === 'streaming'
  const [tasks, setTasks] = useState<DraftFirstClickTask[]>(initialTasks ?? [])
  const [editingId, setEditingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const prevTasksRef = useRef(initialTasks)
  // eslint-disable-next-line react-hooks/refs
  if (initialTasks && initialTasks !== prevTasksRef.current) {
    // eslint-disable-next-line react-hooks/refs
    prevTasksRef.current = initialTasks
    setTasks(initialTasks)
  }

  const debouncedEmit = useDebouncedEmit<{ tasks: DraftFirstClickTask[] }>(onStateChange)

  const emitChange = useCallback(
    (updated: DraftFirstClickTask[]) => {
      debouncedEmit({ tasks: updated })
    },
    [debouncedEmit],
  )

  const handleEdit = useCallback(
    (tempId: string, value: string) => {
      setTasks((prev) => {
        const updated = prev.map((t) => (t.tempId === tempId ? { ...t, instruction: value } : t))
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
    const newTask: DraftFirstClickTask = {
      tempId: crypto.randomUUID(),
      instruction: '',
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

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">
          {hasTasks ? `${tasks.length} task${tasks.length === 1 ? '' : 's'}` : 'First Click Tasks'}
        </span>
        {isStreaming && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground animate-pulse">
            generating...
          </span>
        )}
      </div>

      {!hasTasks && isStreaming && (
        <div className="space-y-2">
          <SkeletonItem />
          <SkeletonItem />
          <SkeletonItem />
        </div>
      )}

      {hasTasks && (
        <div className="space-y-2">
          {tasks.map((task, index) => {
            const isLast = index === tasks.length - 1
            const isPulsing = isLast && isStreaming
            const isEditing = editingId === task.tempId

            return (
              <div
                key={task.tempId || `task-${index}`}
                className={cn(
                  'group relative rounded-lg border border-border bg-background px-3 py-2.5 transition-colors hover:border-foreground/20 hover:shadow-sm',
                  isPulsing && 'animate-pulse',
                )}
              >
                <div className="flex items-start gap-2.5">
                  {/* Image thumbnail */}
                  <div className="h-10 w-10 rounded-md bg-muted/50 border border-border shrink-0 flex items-center justify-center overflow-hidden">
                    {task.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={task.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground/50 font-medium">Task {index + 1}</span>

                    {isEditing ? (
                      <input
                        ref={inputRef}
                        type="text"
                        className="w-full text-sm bg-transparent border-b border-primary outline-none py-0 mt-0.5"
                        value={task.instruction}
                        onChange={(e) => handleEdit(task.tempId, e.target.value)}
                        onBlur={stopEditing}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') stopEditing()
                          if (e.key === 'Escape') stopEditing()
                        }}
                        placeholder="Task instruction..."
                      />
                    ) : (
                      <button
                        type="button"
                        className="text-sm text-foreground hover:text-primary cursor-text text-left w-full leading-snug mt-0.5"
                        onClick={() => startEditing(task.tempId)}
                      >
                        {task.instruction || <span className="text-muted-foreground italic">Untitled task</span>}
                      </button>
                    )}
                  </div>

                  {!isStreaming && (
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 -m-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleDelete(task.tempId)}
                      title="Remove task"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {isStreaming && <SkeletonItem />}
        </div>
      )}

      {!isStreaming && (
        <button
          type="button"
          className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-2 rounded-lg border border-dashed border-border hover:border-foreground/30"
          onClick={handleAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          Add task
        </button>
      )}
    </div>
  )
}
