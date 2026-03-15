'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useDebouncedEmit } from './use-debounced-emit'
import { Plus, X } from 'lucide-react'

interface DraftCard {
  tempId: string
  label: string
  description?: string
}

interface DraftCardStackProps {
  cards?: DraftCard[]
  count?: number
  message?: string
  propStatus?: Record<string, 'streaming' | 'complete'>
  onStateChange?: (state: { cards: DraftCard[] }) => void
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <div className="bg-muted rounded h-4 w-3/4 mb-1.5" />
      <div className="bg-muted rounded h-3 w-full" />
    </div>
  )
}

export function DraftCardStack({ cards: initialCards, propStatus, onStateChange }: DraftCardStackProps) {
  const isStreaming = propStatus?.cards === 'streaming'
  const [cards, setCards] = useState<DraftCard[]>(initialCards ?? [])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editField, setEditField] = useState<'label' | 'description' | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const prevCardsRef = useRef(initialCards)
  // eslint-disable-next-line react-hooks/refs
  if (initialCards && initialCards !== prevCardsRef.current) {
    // eslint-disable-next-line react-hooks/refs
    prevCardsRef.current = initialCards
    setCards(initialCards)
  }

  const debouncedEmit = useDebouncedEmit<{ cards: DraftCard[] }>(onStateChange)

  const emitChange = useCallback(
    (updated: DraftCard[]) => {
      debouncedEmit({ cards: updated })
    },
    [debouncedEmit],
  )

  const handleEdit = useCallback(
    (tempId: string, field: 'label' | 'description', value: string) => {
      setCards((prev) => {
        const updated = prev.map((c) => (c.tempId === tempId ? { ...c, [field]: value || undefined } : c))
        emitChange(updated)
        return updated
      })
    },
    [emitChange],
  )

  const handleDelete = useCallback(
    (tempId: string) => {
      setCards((prev) => {
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
    const newCard: DraftCard = {
      tempId: crypto.randomUUID(),
      label: '',
      description: undefined,
    }
    setCards((prev) => {
      const updated = [...prev, newCard]
      emitChange(updated)
      return updated
    })
    setEditingId(newCard.tempId)
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

  const hasCards = cards.length > 0

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">
          {hasCards ? `${cards.length} card${cards.length === 1 ? '' : 's'}` : 'Cards'}
        </span>
        {isStreaming && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground animate-pulse">
            generating...
          </span>
        )}
      </div>

      {!hasCards && isStreaming && (
        <div className="grid grid-cols-3 gap-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {hasCards && (
        <div className="grid grid-cols-3 gap-2">
          {cards.map((card, index) => {
            const isLast = index === cards.length - 1
            const isPulsing = isLast && isStreaming
            const isEditing = editingId === card.tempId
            const key = card.tempId || `card-${index}`

            return (
              <div
                key={key}
                className={cn(
                  'group relative rounded-lg border border-border bg-background px-3 py-2.5 transition-colors hover:border-foreground/20 hover:shadow-sm',
                  isPulsing && 'animate-pulse',
                )}
              >
                {/* Card number + delete */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground/50 font-medium">{index + 1}</span>
                  {!isStreaming && (
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 -m-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(card.tempId)}
                      title="Remove card"
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
                    value={card.label}
                    onChange={(e) => handleEdit(card.tempId, 'label', e.target.value)}
                    onBlur={stopEditing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') stopEditing()
                      if (e.key === 'Escape') stopEditing()
                    }}
                    placeholder="Card label..."
                  />
                ) : (
                  <button
                    type="button"
                    className="text-sm font-medium text-foreground hover:text-primary cursor-text text-left w-full leading-snug"
                    onClick={() => startEditing(card.tempId, 'label')}
                  >
                    {card.label || <span className="text-muted-foreground italic">Untitled</span>}
                  </button>
                )}

                {/* Description */}
                {isEditing && editField === 'description' ? (
                  <input
                    ref={inputRef}
                    type="text"
                    className="w-full text-xs text-muted-foreground bg-transparent border-b border-primary outline-none mt-1.5 py-0"
                    value={card.description ?? ''}
                    onChange={(e) => handleEdit(card.tempId, 'description', e.target.value)}
                    onBlur={stopEditing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') stopEditing()
                      if (e.key === 'Escape') stopEditing()
                    }}
                    placeholder="Add description..."
                  />
                ) : card.description ? (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground cursor-text text-left w-full mt-1.5 leading-relaxed line-clamp-2"
                    onClick={() => startEditing(card.tempId, 'description')}
                  >
                    {card.description}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground/40 hover:text-muted-foreground cursor-text text-left w-full mt-1.5 italic opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => startEditing(card.tempId, 'description')}
                  >
                    Add description...
                  </button>
                )}
              </div>
            )
          })}

          {isStreaming && <SkeletonCard />}
        </div>
      )}

      {!isStreaming && (
        <button
          type="button"
          className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-2 rounded-lg border border-dashed border-border hover:border-foreground/30"
          onClick={handleAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          Add card
        </button>
      )}
    </div>
  )
}
