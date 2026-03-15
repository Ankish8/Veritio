'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useDebouncedEmit } from './use-debounced-emit'
import { Plus, X } from 'lucide-react'

interface DraftPrototypeTask {
  tempId: string
  title: string
  description?: string
}

interface DraftPrototypeTaskListProps {
  tasks?: DraftPrototypeTask[]
  count?: number
  message?: string
  propStatus?: Record<string, 'streaming' | 'complete'>
  onStateChange?: (state: { tasks: DraftPrototypeTask[] }) => void
}

function SkeletonItem() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <div className="bg-muted rounded h-4 w-3/4 mb-1.5" />
      <div className="bg-muted rounded h-3 w-full" />
    </div>
  )
}

export function DraftPrototypeTaskList({ tasks: initialTasks, propStatus, onStateChange }: DraftPrototypeTaskListProps) {
  const isStreaming = propStatus?.tasks === 'streaming'
  const [tasks, setTasks] = useState<DraftPrototypeTask[]>(initialTasks ?? [])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editField, setEditField] = useState<'title' | 'description' | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const prevTasksRef = useRef(initialTasks)
  // eslint-disable-next-line react-hooks/refs
  if (initialTasks && initialTasks !== prevTasksRef.current) {
    // eslint-disable-next-line react-hooks/refs
    prevTasksRef.current = initialTasks
    setTasks(initialTasks)
  }

  const debouncedEmit = useDebouncedEmit<{ tasks: DraftPrototypeTask[] }>(onStateChange)

  const emitChange = useCallback(
    (updated: DraftPrototypeTask[]) => {
      debouncedEmit({ tasks: updated })
    },
    [debouncedEmit],
  )

  const handleEdit = useCallback(
    (tempId: string, field: 'title' | 'description', value: string) => {
      setTasks((prev) => {
        const updated = prev.map((t) => (t.tempId === tempId ? { ...t, [field]: value || undefined } : t))
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
      if (editingId === tempId) {
        setEditingId(null)
        setEditField(null)
      }
    },
    [emitChange, editingId],
  )

  const handleAdd = useCallback(() => {
    const newTask: DraftPrototypeTask = {
      tempId: crypto.randomUUID(),
      title: '',
    }
    setTasks((prev) => {
      const updated = [...prev, newTask]
      emitChange(updated)
      return updated
    })
    setEditingId(newTask.tempId)
    setEditField('title')
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [emitChange])

  const startEditing = useCallback((tempId: string, field: 'title' | 'description') => {
    setEditingId(tempId)
    setEditField(field)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const stopEditing = useCallback(() => {
    setEditingId(null)
    setEditField(null)
  }, [])

  const hasTasks = tasks.length > 0

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">
          {hasTasks ? `${tasks.length} task${tasks.length === 1 ? '' : 's'}` : 'Prototype Tasks'}
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
                  <span className="text-xs text-muted-foreground/50 font-medium mt-0.5 shrink-0">{index + 1}</span>

                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    {isEditing && editField === 'title' ? (
                      <input
                        ref={inputRef}
                        type="text"
                        className="w-full text-sm font-medium bg-transparent border-b border-primary outline-none py-0"
                        value={task.title}
                        onChange={(e) => handleEdit(task.tempId, 'title', e.target.value)}
                        onBlur={stopEditing}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') stopEditing()
                          if (e.key === 'Escape') stopEditing()
                        }}
                        placeholder="Task title..."
                      />
                    ) : (
                      <button
                        type="button"
                        className="text-sm font-medium text-foreground hover:text-primary cursor-text text-left w-full leading-snug"
                        onClick={() => startEditing(task.tempId, 'title')}
                      >
                        {task.title || <span className="text-muted-foreground italic">Untitled task</span>}
                      </button>
                    )}

                    {/* Description */}
                    {isEditing && editField === 'description' ? (
                      <input
                        ref={inputRef}
                        type="text"
                        className="w-full text-xs text-muted-foreground bg-transparent border-b border-primary outline-none mt-1.5 py-0"
                        value={task.description ?? ''}
                        onChange={(e) => handleEdit(task.tempId, 'description', e.target.value)}
                        onBlur={stopEditing}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') stopEditing()
                          if (e.key === 'Escape') stopEditing()
                        }}
                        placeholder="Add description..."
                      />
                    ) : task.description ? (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground cursor-text text-left w-full mt-1.5 leading-relaxed line-clamp-2"
                        onClick={() => startEditing(task.tempId, 'description')}
                      >
                        {task.description}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground/40 hover:text-muted-foreground cursor-text text-left w-full mt-1.5 italic opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => startEditing(task.tempId, 'description')}
                      >
                        Add description...
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
        <>
          <button
            type="button"
            className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-2 rounded-lg border border-dashed border-border hover:border-foreground/30"
            onClick={handleAdd}
          >
            <Plus className="h-3.5 w-3.5" />
            Add task
          </button>
          <p className="mt-2 text-[10px] text-muted-foreground/60 text-center">
            Connect your Figma prototype in the builder after creation.
          </p>
        </>
      )}
    </div>
  )
}
