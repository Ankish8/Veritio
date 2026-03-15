'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useDebouncedEmit } from './use-debounced-emit'
import { Plus, X, ImageIcon } from 'lucide-react'

interface DraftFirstImpressionDesign {
  tempId: string
  name: string
  imageUrl?: string
  isPractice?: boolean
}

interface DraftFirstImpressionDesignListProps {
  designs?: DraftFirstImpressionDesign[]
  count?: number
  message?: string
  propStatus?: Record<string, 'streaming' | 'complete'>
  onStateChange?: (state: { designs: DraftFirstImpressionDesign[] }) => void
}

function SkeletonItem() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-muted/30 p-3">
      <div className="bg-muted rounded h-20 w-full mb-2" />
      <div className="bg-muted rounded h-4 w-2/3" />
    </div>
  )
}

export function DraftFirstImpressionDesignList({ designs: initialDesigns, propStatus, onStateChange }: DraftFirstImpressionDesignListProps) {
  const isStreaming = propStatus?.designs === 'streaming'
  const [designs, setDesigns] = useState<DraftFirstImpressionDesign[]>(initialDesigns ?? [])
  const [editingId, setEditingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const prevDesignsRef = useRef(initialDesigns)
  // eslint-disable-next-line react-hooks/refs
  if (initialDesigns && initialDesigns !== prevDesignsRef.current) {
    // eslint-disable-next-line react-hooks/refs
    prevDesignsRef.current = initialDesigns
    setDesigns(initialDesigns)
  }

  const debouncedEmit = useDebouncedEmit<{ designs: DraftFirstImpressionDesign[] }>(onStateChange)

  const emitChange = useCallback(
    (updated: DraftFirstImpressionDesign[]) => {
      debouncedEmit({ designs: updated })
    },
    [debouncedEmit],
  )

  const handleEdit = useCallback(
    (tempId: string, value: string) => {
      setDesigns((prev) => {
        const updated = prev.map((d) => (d.tempId === tempId ? { ...d, name: value } : d))
        emitChange(updated)
        return updated
      })
    },
    [emitChange],
  )

  const handleDelete = useCallback(
    (tempId: string) => {
      setDesigns((prev) => {
        const updated = prev.filter((d) => d.tempId !== tempId)
        emitChange(updated)
        return updated
      })
      if (editingId === tempId) setEditingId(null)
    },
    [emitChange, editingId],
  )

  const handleAdd = useCallback(() => {
    const newDesign: DraftFirstImpressionDesign = {
      tempId: crypto.randomUUID(),
      name: '',
    }
    setDesigns((prev) => {
      const updated = [...prev, newDesign]
      emitChange(updated)
      return updated
    })
    setEditingId(newDesign.tempId)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [emitChange])

  const startEditing = useCallback((tempId: string) => {
    setEditingId(tempId)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const stopEditing = useCallback(() => {
    setEditingId(null)
  }, [])

  const hasDesigns = designs.length > 0

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">
          {hasDesigns ? `${designs.length} design${designs.length === 1 ? '' : 's'}` : 'Designs'}
        </span>
        {isStreaming && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground animate-pulse">
            generating...
          </span>
        )}
      </div>

      {!hasDesigns && isStreaming && (
        <div className="grid grid-cols-2 gap-2">
          <SkeletonItem />
          <SkeletonItem />
        </div>
      )}

      {hasDesigns && (
        <div className="grid grid-cols-2 gap-2">
          {designs.map((design, index) => {
            const isLast = index === designs.length - 1
            const isPulsing = isLast && isStreaming
            const isEditing = editingId === design.tempId

            return (
              <div
                key={design.tempId || `design-${index}`}
                className={cn(
                  'group relative rounded-lg border border-border bg-background p-3 transition-colors hover:border-foreground/20 hover:shadow-sm',
                  isPulsing && 'animate-pulse',
                )}
              >
                {/* Delete button */}
                {!isStreaming && (
                  <button
                    type="button"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive z-10"
                    onClick={() => handleDelete(design.tempId)}
                    title="Remove design"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Image thumbnail */}
                <div className="h-20 w-full rounded-md bg-muted/50 border border-border mb-2 flex items-center justify-center overflow-hidden">
                  {design.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={design.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                  )}
                </div>

                {/* Name + practice badge */}
                <div className="flex items-center gap-1.5">
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      type="text"
                      className="flex-1 text-sm font-medium bg-transparent border-b border-primary outline-none py-0"
                      value={design.name}
                      onChange={(e) => handleEdit(design.tempId, e.target.value)}
                      onBlur={stopEditing}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') stopEditing()
                        if (e.key === 'Escape') stopEditing()
                      }}
                      placeholder="Design name..."
                    />
                  ) : (
                    <button
                      type="button"
                      className="text-sm font-medium text-foreground hover:text-primary cursor-text text-left flex-1 leading-snug"
                      onClick={() => startEditing(design.tempId)}
                    >
                      {design.name || <span className="text-muted-foreground italic">Untitled</span>}
                    </button>
                  )}

                  {design.isPractice && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
                      Practice
                    </span>
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
          Add design
        </button>
      )}
    </div>
  )
}
