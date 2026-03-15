'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, GripVertical, Pencil, Trash2, X, Check, Upload, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { KeyboardShortcutHint, EscapeHint } from '@/components/ui/keyboard-shortcut-hint'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCardSortBuilderStore } from '@/stores/study-builder'
import { ImportExportDialog, type ImportableItem } from '@/components/builders/shared/import-export-dialog'
import { CardImageUpload } from './card-image-upload'
import type { CardWithImage, CardImage } from '@veritio/study-types'

interface SortableCardItemProps {
  card: CardWithImage
  onEdit: (card: CardWithImage) => void
  onDelete: (id: string) => void
}

function SortableCardItem({ card, onEdit, onDelete }: SortableCardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-md border bg-background p-3 ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <button
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {card.image?.url && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={card.image.url}
          alt={card.image.alt || card.label}
          className="h-10 w-10 rounded border object-cover flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{card.label}</p>
        {card.description && (
          <p className="text-sm text-muted-foreground truncate">{card.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(card)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(card.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

interface CardFormProps {
  card?: CardWithImage
  studyId: string
  onSave: (label: string, description: string, image: CardImage | null) => void
  onCancel: () => void
}

function CardForm({ card, studyId, onSave, onCancel }: CardFormProps) {
  const [label, setLabel] = useState(card?.label ?? '')
  const [description, setDescription] = useState(card?.description ?? '')
  const [image, setImage] = useState<CardImage | null>(card?.image ?? null)

  const cardId = card?.id ?? crypto.randomUUID()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (label.trim()) {
      onSave(label.trim(), description.trim(), image)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border bg-muted/50 p-3">
      <CardImageUpload
        studyId={studyId}
        cardId={cardId}
        image={image}
        onChange={setImage}
      />

      <div className="space-y-1.5">
        <Input
          placeholder="Card label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={!label.trim()}>
          <Check className="mr-1.5 h-3.5 w-3.5" />
          {card ? 'Update' : 'Add'}
          <KeyboardShortcutHint shortcut="enter" variant="dark" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="mr-1.5 h-3.5 w-3.5" />
          Cancel
          <EscapeHint />
        </Button>
      </div>
    </form>
  )
}

interface CardEditorProps {
  studyId: string
}

export function CardEditor({ studyId }: CardEditorProps) {
  const { cards, addCard, updateCard, removeCard, reorderCards } = useCardSortBuilderStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCard, setEditingCard] = useState<CardWithImage | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleImport = useCallback((items: ImportableItem[]) => {
    const startPosition = cards.length
    items.forEach((item, index) => {
      addCard({
        study_id: studyId,
        label: item.label,
        description: item.description || null,
        position: startPosition + index,
        image: item.imageUrl ? { url: item.imageUrl } : null,
      })
    })
  }, [cards.length, studyId, addCard])

  const exportableCards: ImportableItem[] = cards.map((card) => ({
    label: card.label,
    description: card.description,
    imageUrl: card.image?.url || null,
  }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = cards.findIndex((card) => card.id === active.id)
      const newIndex = cards.findIndex((card) => card.id === over.id)

      const newCards = arrayMove(cards, oldIndex, newIndex).map((card, index) => ({
        ...card,
        position: index,
      }))

      reorderCards(newCards)
    }
  }

  const handleAddCard = (label: string, description: string, image: CardImage | null) => {
    addCard({
      study_id: studyId,
      label,
      description: description || null,
      position: cards.length,
      image,
    })
    setShowAddForm(false)
  }

  const handleUpdateCard = (label: string, description: string, image: CardImage | null) => {
    if (editingCard) {
      updateCard(editingCard.id, {
        label,
        description: description || null,
        image: image || undefined,
      })
      setEditingCard(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Cards</CardTitle>
          <div className="flex items-center gap-2">
            <ImportExportDialog
              title="Import/Export Cards"
              description="Import cards from CSV, JSON, or plain text. Export your existing cards in various formats."
              items={exportableCards}
              onImport={handleImport}
              itemName="card"
              trigger={
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground">
                  <Upload className="h-3.5 w-3.5" />
                  <Download className="h-3.5 w-3.5" />
                </Button>
              }
            />
            <span className="text-sm text-muted-foreground">
              {cards.length} card{cards.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {cards.length > 0 && (
          <ScrollArea className="h-[300px] pr-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={cards.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {cards.map((card) =>
                    editingCard?.id === card.id ? (
                      <CardForm
                        key={card.id}
                        card={card}
                        studyId={studyId}
                        onSave={handleUpdateCard}
                        onCancel={() => setEditingCard(null)}
                      />
                    ) : (
                      <SortableCardItem
                        key={card.id}
                        card={card}
                        onEdit={setEditingCard}
                        onDelete={removeCard}
                      />
                    )
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>
        )}

        {cards.length === 0 && !showAddForm && (
          <div className="rounded-md border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No cards yet. Add your first card to get started.
            </p>
          </div>
        )}

        {showAddForm ? (
          <CardForm
            studyId={studyId}
            onSave={handleAddCard}
            onCancel={() => setShowAddForm(false)}
          />
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Card
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
