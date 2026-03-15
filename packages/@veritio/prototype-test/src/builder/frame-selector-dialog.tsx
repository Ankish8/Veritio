'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, Check, Play, FileText, ChevronDown, ChevronRight } from 'lucide-react'
import {
  Button,
  Input,
  KeyboardShortcutHint,
  EscapeHint,
  useKeyboardShortcut,
  cn,
} from '@veritio/ui'
import type { PrototypeTestFrame, PrototypeTestTask } from '@veritio/study-types'

interface FrameSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  frames: PrototypeTestFrame[]
  selectedFrameIds: string[]
  onSelect: (frameIds: string[]) => void
  mode: 'single' | 'multiple'
  title?: string
  description?: string
  tasks?: PrototypeTestTask[]
}
function FrameThumbnail({
  frame,
  isSelected,
  onClick,
}: {
  frame: PrototypeTestFrame
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative group rounded-lg border-2 overflow-hidden transition-all',
        'hover:border-primary/50',
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-border'
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-muted flex items-center justify-center">
        {frame.thumbnail_url ? (
          <img
            src={frame.thumbnail_url}
            alt={frame.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-xs text-muted-foreground">
            No preview
          </div>
        )}
      </div>

      {/* Name */}
      <div className="p-2 text-xs truncate bg-background">
        {frame.name}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </button>
  )
}
interface PageGroup {
  pageName: string
  frames: PrototypeTestFrame[]
}

export function FrameSelectorDialog({
  open,
  onOpenChange,
  frames,
  selectedFrameIds,
  onSelect,
  mode,
  title = 'Select Frame',
  description,
  tasks = [],
}: FrameSelectorDialogProps) {
  const [search, setSearch] = useState('')
  const [tempSelection, setTempSelection] = useState<string[]>(selectedFrameIds)
  const [collapsedPages, setCollapsedPages] = useState<Set<string>>(new Set())
  const contentRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Get the set of frame IDs that are used as task starting screens
  const taskStartFrameIds = useMemo(() => {
    const startIds = new Set<string>()
    tasks.forEach((task) => {
      if (task.start_frame_id) {
        startIds.add(task.start_frame_id)
      }
    })
    return startIds
  }, [tasks])

  // Group frames by Figma page name
  const { taskStartFrames, filteredTaskStarts, filteredPageGroups, hasPageNames } = useMemo(() => {
    const taskStarts = frames.filter((f) => taskStartFrameIds.has(f.id))

    // Check if any frames have page_name set
    const anyHasPageName = frames.some((f) => f.page_name)

    // Group frames by page_name, preserving order
    const pageMap = new Map<string, PrototypeTestFrame[]>()
    frames.forEach((frame) => {
      const pageName = frame.page_name || 'Other'
      if (!pageMap.has(pageName)) {
        pageMap.set(pageName, [])
      }
      pageMap.get(pageName)!.push(frame)
    })

    const groups: PageGroup[] = Array.from(pageMap.entries()).map(([pageName, pageFrames]) => ({
      pageName,
      frames: pageFrames,
    }))

    if (!search.trim()) {
      return {
        taskStartFrames: taskStarts,
        filteredTaskStarts: taskStarts,
        filteredPageGroups: groups,
        hasPageNames: anyHasPageName,
      }
    }

    const searchLower = search.toLowerCase()
    const matchesSearch = (frame: PrototypeTestFrame) =>
      frame.name.toLowerCase().includes(searchLower) ||
      (frame.page_name?.toLowerCase().includes(searchLower) ?? false)

    const filteredGroups = groups
      .map((group) => ({
        ...group,
        frames: group.frames.filter(matchesSearch),
      }))
      .filter((group) => group.frames.length > 0)

    return {
      taskStartFrames: taskStarts,
      filteredTaskStarts: taskStarts.filter(matchesSearch),
      filteredPageGroups: filteredGroups,
      hasPageNames: anyHasPageName,
    }
  }, [frames, taskStartFrameIds, search])

  // Check if we should show task start section
  const showTaskStartSection = taskStartFrames.length > 0 && tasks.length > 0

  // Toggle page collapse state
  const togglePageCollapse = (pageName: string) => {
    setCollapsedPages((prev) => {
      const next = new Set(prev)
      if (next.has(pageName)) {
        next.delete(pageName)
      } else {
        next.add(pageName)
      }
      return next
    })
  }

  const handleFrameClick = (frameId: string) => {
    if (mode === 'single') {
      setTempSelection([frameId])
    } else {
      setTempSelection((prev) =>
        prev.includes(frameId)
          ? prev.filter((id) => id !== frameId)
          : [...prev, frameId]
      )
    }
  }

  const handleConfirm = useCallback(() => {
    if (tempSelection.length === 0) return
    onSelect(tempSelection)
    onOpenChange(false)
  }, [tempSelection, onSelect, onOpenChange])

  const handleClose = useCallback(() => {
    setTempSelection(selectedFrameIds)
    setSearch('')
    onOpenChange(false)
  }, [selectedFrameIds, onOpenChange])

  // Keyboard shortcuts: Cmd+Enter to confirm (when selection exists)
  useKeyboardShortcut({
    enabled: open && tempSelection.length > 0,
    onCmdEnter: handleConfirm,
  })

  // Reset temp selection when dialog opens + focus search input
  useEffect(() => {
    if (open) {
      setTempSelection(selectedFrameIds)
      setSearch('')
      // Focus search input after portal renders
      requestAnimationFrame(() => {
        searchInputRef.current?.focus()
      })
    }
  }, [open, selectedFrameIds])

  // Escape key to close
  useEffect(() => {
    if (!open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        handleClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, handleClose])

  // Render nothing if closed or no portal target
  if (!open || typeof document === 'undefined') return null

  // Use createPortal directly to avoid nested Radix Dialog conflicts.
  // When this component is rendered inside another Dialog (e.g. PathwayBuilderModal),
  // Radix's DismissableLayer + hideOthers + forceMount create conflicts that prevent
  // the inner dialog from appearing. Direct portaling bypasses all of that.
  return createPortal(
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[200] bg-black/50 animate-in fade-in-0"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Content */}
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed left-[50%] top-[50%] z-[200] w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-background shadow-lg max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95"
        style={{ pointerEvents: 'auto' }}
      >
        <div className="flex-shrink-0 p-6 pb-4 gap-2 flex flex-col">
          <h2 className="text-sm leading-none font-medium">{title}</h2>
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </div>

        <div className="relative flex-shrink-0 px-6">
          <Search className="absolute left-9 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search frames..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="overflow-y-auto max-h-[50vh] px-6">
          {frames.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No frames available. Sync the prototype first.
            </div>
          ) : filteredPageGroups.length === 0 && filteredTaskStarts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No frames match your search.
            </div>
          ) : (
            <div className="py-4 space-y-4">
              {/* Task Start Screens Section (always at top when present) */}
              {showTaskStartSection && filteredTaskStarts.length > 0 && (
                <div className="pb-2 border-b">
                  <div className="flex items-center gap-2 mb-3">
                    <Play className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium text-foreground">Task start screens</h3>
                    <span className="text-xs text-muted-foreground">({filteredTaskStarts.length})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {filteredTaskStarts.map((frame) => (
                      <FrameThumbnail
                        key={frame.id}
                        frame={frame}
                        isSelected={tempSelection.includes(frame.id)}
                        onClick={() => handleFrameClick(frame.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Page-grouped frames */}
              {hasPageNames ? (
                // Group by Figma page name
                filteredPageGroups.map((group) => {
                  const isCollapsed = collapsedPages.has(group.pageName)
                  return (
                    <div key={group.pageName}>
                      <button
                        type="button"
                        onClick={() => togglePageCollapse(group.pageName)}
                        className="flex items-center gap-2 mb-3 w-full text-left hover:bg-muted/50 rounded-md px-1 py-0.5 -ml-1 transition-colors"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-medium text-foreground">{group.pageName}</h3>
                        <span className="text-xs text-muted-foreground">({group.frames.length})</span>
                      </button>
                      {!isCollapsed && (
                        <div className="grid grid-cols-3 gap-3">
                          {group.frames.map((frame) => (
                            <FrameThumbnail
                              key={frame.id}
                              frame={frame}
                              isSelected={tempSelection.includes(frame.id)}
                              onClick={() => handleFrameClick(frame.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                // Flat list (legacy data without page names)
                <div className="grid grid-cols-3 gap-3">
                  {frames
                    .filter(
                      (f) =>
                        !search.trim() ||
                        f.name.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((frame) => (
                      <FrameThumbnail
                        key={frame.id}
                        frame={frame}
                        isSelected={tempSelection.includes(frame.id)}
                        onClick={() => handleFrameClick(frame.id)}
                      />
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t p-4 flex-shrink-0 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {tempSelection.length} frame{tempSelection.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
              <EscapeHint />
            </Button>
            <Button onClick={handleConfirm} disabled={tempSelection.length === 0}>
              {mode === 'single' ? 'Select' : 'Confirm Selection'}
              <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
