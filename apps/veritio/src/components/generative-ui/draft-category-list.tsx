'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useDebouncedEmit } from './use-debounced-emit'
import { Plus, X } from 'lucide-react'

interface DraftCategory {
  tempId: string
  label: string
  description?: string
}

interface DraftCategoryListProps {
  categories?: DraftCategory[]
  count?: number
  message?: string
  propStatus?: Record<string, 'streaming' | 'complete'>
  onStateChange?: (state: { categories: DraftCategory[] }) => void
}

function SkeletonItem() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <div className="bg-muted rounded h-4 w-2/3" />
    </div>
  )
}

export function DraftCategoryList({ categories: initialCategories, propStatus, onStateChange }: DraftCategoryListProps) {
  const isStreaming = propStatus?.categories === 'streaming'
  const [categories, setCategories] = useState<DraftCategory[]>(initialCategories ?? [])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editField, setEditField] = useState<'label' | 'description' | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const prevCategoriesRef = useRef(initialCategories)
  // eslint-disable-next-line react-hooks/refs
  if (initialCategories && initialCategories !== prevCategoriesRef.current) {
    // eslint-disable-next-line react-hooks/refs
    prevCategoriesRef.current = initialCategories
    setCategories(initialCategories)
  }

  const debouncedEmit = useDebouncedEmit<{ categories: DraftCategory[] }>(onStateChange)

  const emitChange = useCallback(
    (updated: DraftCategory[]) => {
      debouncedEmit({ categories: updated })
    },
    [debouncedEmit],
  )

  const handleEdit = useCallback(
    (tempId: string, field: 'label' | 'description', value: string) => {
      setCategories((prev) => {
        const updated = prev.map((c) => (c.tempId === tempId ? { ...c, [field]: value || undefined } : c))
        emitChange(updated)
        return updated
      })
    },
    [emitChange],
  )

  const handleDelete = useCallback(
    (tempId: string) => {
      setCategories((prev) => {
        const updated = prev.filter((c) => c.tempId !== tempId)
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
    const newCategory: DraftCategory = {
      tempId: crypto.randomUUID(),
      label: '',
      description: undefined,
    }
    setCategories((prev) => {
      const updated = [...prev, newCategory]
      emitChange(updated)
      return updated
    })
    setEditingId(newCategory.tempId)
    setEditField('label')
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [emitChange])

  const startEditing = useCallback((tempId: string, field: 'label' | 'description') => {
    setEditingId(tempId)
    setEditField(field)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const stopEditing = useCallback(() => {
    setEditingId(null)
    setEditField(null)
  }, [])

  const hasCategories = categories.length > 0

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">
          {hasCategories ? `${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}` : 'Categories'}
        </span>
        {isStreaming && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground animate-pulse">
            generating...
          </span>
        )}
      </div>

      {!hasCategories && isStreaming && (
        <div className="grid grid-cols-3 gap-2">
          <SkeletonItem />
          <SkeletonItem />
          <SkeletonItem />
        </div>
      )}

      {hasCategories && (
        <div className="grid grid-cols-3 gap-2">
          {categories.map((category, index) => {
            const isLast = index === categories.length - 1
            const isPulsing = isLast && isStreaming
            const isEditing = editingId === category.tempId
            const key = category.tempId || `cat-${index}`

            return (
              <div
                key={key}
                className={cn(
                  'group relative rounded-lg border border-border bg-background px-3 py-2.5 transition-colors hover:border-foreground/20 hover:shadow-sm',
                  isPulsing && 'animate-pulse',
                )}
              >
                {/* Color chip + delete */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm bg-primary/25 border border-primary/30" />
                  {!isStreaming && (
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 -m-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(category.tempId)}
                      title="Remove category"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Label */}
                {isEditing && editField === 'label' ? (
                  <input
                    ref={inputRef}
                    type="text"
                    className="w-full text-sm font-medium bg-transparent border-b border-primary outline-none py-0"
                    value={category.label}
                    onChange={(e) => handleEdit(category.tempId, 'label', e.target.value)}
                    onBlur={stopEditing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') stopEditing()
                      if (e.key === 'Escape') stopEditing()
                    }}
                    placeholder="Category name..."
                  />
                ) : (
                  <button
                    type="button"
                    className="text-sm font-medium text-foreground hover:text-primary cursor-text text-left w-full leading-snug"
                    onClick={() => startEditing(category.tempId, 'label')}
                  >
                    {category.label || <span className="text-muted-foreground italic">Untitled</span>}
                  </button>
                )}

                {/* Description */}
                {isEditing && editField === 'description' ? (
                  <input
                    ref={inputRef}
                    type="text"
                    className="w-full text-xs text-muted-foreground bg-transparent border-b border-primary outline-none mt-1.5 py-0"
                    value={category.description ?? ''}
                    onChange={(e) => handleEdit(category.tempId, 'description', e.target.value)}
                    onBlur={stopEditing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') stopEditing()
                      if (e.key === 'Escape') stopEditing()
                    }}
                    placeholder="Add description..."
                  />
                ) : category.description ? (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground cursor-text text-left w-full mt-1.5 leading-relaxed line-clamp-2"
                    onClick={() => startEditing(category.tempId, 'description')}
                  >
                    {category.description}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground/40 hover:text-muted-foreground cursor-text text-left w-full mt-1.5 italic opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => startEditing(category.tempId, 'description')}
                  >
                    Add description...
                  </button>
                )}
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
          Add category
        </button>
      )}
    </div>
  )
}
