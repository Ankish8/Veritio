'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useDebouncedEmit } from './use-debounced-emit'
import { Plus, X, Link2 } from 'lucide-react'

interface DraftLiveWebsiteTask {
  tempId: string
  title: string
  instructions?: string
  targetUrl: string
  successUrl?: string
  successCriteriaType?: string
  timeLimitSeconds?: number
}

const TRACKING_MODES = [
  { value: 'url_only', label: 'Observer Mode', description: 'Share a URL, screen recording + post-task responses' },
  { value: 'reverse_proxy', label: 'Auto Mode', description: 'Full tracking, no code needed' },
  { value: 'snippet', label: 'Snippet Mode', description: 'Full tracking via installed script' },
] as const

interface DraftLiveWebsiteTaskListProps {
  tasks?: DraftLiveWebsiteTask[]
  website_url?: string
  mode?: string
  count?: number
  message?: string
  propStatus?: Record<string, 'streaming' | 'complete'>
  onStateChange?: (state: { tasks: DraftLiveWebsiteTask[]; websiteUrl?: string; mode?: string }) => void
}

function SkeletonItem() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <div className="bg-muted rounded h-4 w-3/4 mb-1.5" />
      <div className="bg-muted rounded h-3 w-full mb-1.5" />
      <div className="bg-muted rounded h-3 w-1/2" />
    </div>
  )
}

function formatCriteriaType(type?: string): string {
  if (!type) return ''
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function DraftLiveWebsiteTaskList({ tasks: initialTasks, website_url: initialWebsiteUrl, mode: initialMode, propStatus, onStateChange }: DraftLiveWebsiteTaskListProps) {
  const isStreaming = propStatus?.tasks === 'streaming'
  const [tasks, setTasks] = useState<DraftLiveWebsiteTask[]>(initialTasks ?? [])
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl ?? '')
  const [mode, setMode] = useState(initialMode ?? 'reverse_proxy')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editField, setEditField] = useState<'title' | 'instructions' | 'targetUrl' | null>(null)
  const [editingUrl, setEditingUrl] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const urlInputRef = useRef<HTMLInputElement | null>(null)

  const prevTasksRef = useRef(initialTasks)
  // eslint-disable-next-line react-hooks/refs
  if (initialTasks && initialTasks !== prevTasksRef.current) {
    // eslint-disable-next-line react-hooks/refs
    prevTasksRef.current = initialTasks
    setTasks(initialTasks)
  }

  const websiteUrlRef = useRef(websiteUrl)
  const modeRef = useRef(mode)

  const debouncedEmit = useDebouncedEmit<{ tasks: DraftLiveWebsiteTask[]; websiteUrl?: string; mode?: string }>(onStateChange)

  const emitChange = useCallback(
    (updatedTasks: DraftLiveWebsiteTask[], updatedUrl?: string, updatedMode?: string) => {
      debouncedEmit({
        tasks: updatedTasks,
        websiteUrl: updatedUrl ?? websiteUrlRef.current,
        mode: updatedMode ?? modeRef.current,
      })
    },
    [debouncedEmit],
  )

  const handleWebsiteUrlChange = useCallback(
    (value: string) => {
      setWebsiteUrl(value)
      websiteUrlRef.current = value
      emitChange(tasks, value, modeRef.current)
    },
    [emitChange, tasks],
  )

  const handleModeChange = useCallback(
    (value: string) => {
      setMode(value)
      modeRef.current = value
      emitChange(tasks, websiteUrlRef.current, value)
    },
    [emitChange, tasks],
  )

  const handleEdit = useCallback(
    (tempId: string, field: 'title' | 'instructions' | 'targetUrl', value: string) => {
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
    const newTask: DraftLiveWebsiteTask = {
      tempId: crypto.randomUUID(),
      title: '',
      targetUrl: '',
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

  const startEditing = useCallback((tempId: string, field: 'title' | 'instructions' | 'targetUrl') => {
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
      {/* Website Setup Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Website Setup</span>
        </div>

        {/* Website URL */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <Link2 className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
          {editingUrl ? (
            <input
              ref={urlInputRef}
              type="url"
              className="flex-1 text-sm bg-transparent border-b border-primary outline-none py-0"
              value={websiteUrl}
              onChange={(e) => handleWebsiteUrlChange(e.target.value)}
              onBlur={() => setEditingUrl(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setEditingUrl(false)
              }}
              placeholder="https://example.com"
              autoFocus
            />
          ) : (
            <button
              type="button"
              className="flex-1 text-sm text-left hover:text-primary cursor-text truncate"
              onClick={() => {
                setEditingUrl(true)
                setTimeout(() => urlInputRef.current?.focus(), 50)
              }}
            >
              {websiteUrl || <span className="text-muted-foreground/50 italic">Set website URL...</span>}
            </button>
          )}
        </div>

        {/* Tracking Mode Selector */}
        <div className="flex rounded-md border border-border overflow-hidden bg-muted/50">
          {TRACKING_MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                'flex-1 py-1 text-xs font-medium transition-colors',
                mode === option.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => handleModeChange(option.value)}
              title={option.description}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground/60 mt-1">
          {TRACKING_MODES.find((o) => o.value === mode)?.description}
        </p>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">
          {hasTasks ? `${tasks.length} task${tasks.length === 1 ? '' : 's'}` : 'Tasks'}
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
                <div className="flex items-start justify-between gap-2">
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

                    {/* Target URL */}
                    <div className="flex items-center gap-1 mt-1.5">
                      <Link2 className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                      {isEditing && editField === 'targetUrl' ? (
                        <input
                          ref={inputRef}
                          type="url"
                          className="flex-1 text-xs text-muted-foreground bg-transparent border-b border-primary outline-none py-0"
                          value={task.targetUrl ?? ''}
                          onChange={(e) => handleEdit(task.tempId, 'targetUrl', e.target.value)}
                          onBlur={stopEditing}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') stopEditing()
                            if (e.key === 'Escape') stopEditing()
                          }}
                          placeholder="https://example.com"
                        />
                      ) : (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground cursor-text text-left flex-1 truncate"
                          onClick={() => startEditing(task.tempId, 'targetUrl')}
                        >
                          {task.targetUrl || <span className="text-muted-foreground/40 italic">Set target URL...</span>}
                        </button>
                      )}
                    </div>

                    {/* Instructions */}
                    {isEditing && editField === 'instructions' ? (
                      <input
                        ref={inputRef}
                        type="text"
                        className="w-full text-xs text-muted-foreground bg-transparent border-b border-primary outline-none mt-1.5 py-0"
                        value={task.instructions ?? ''}
                        onChange={(e) => handleEdit(task.tempId, 'instructions', e.target.value)}
                        onBlur={stopEditing}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') stopEditing()
                          if (e.key === 'Escape') stopEditing()
                        }}
                        placeholder="Add instructions..."
                      />
                    ) : task.instructions ? (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground cursor-text text-left w-full mt-1.5 leading-relaxed line-clamp-2"
                        onClick={() => startEditing(task.tempId, 'instructions')}
                      >
                        {task.instructions}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground/40 hover:text-muted-foreground cursor-text text-left w-full mt-1.5 italic opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => startEditing(task.tempId, 'instructions')}
                      >
                        Add instructions...
                      </button>
                    )}

                    {/* Success criteria badge */}
                    {task.successCriteriaType && (
                      <span className="inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {formatCriteriaType(task.successCriteriaType)}
                      </span>
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
