'use client'

import { useState, useRef, useEffect } from 'react'
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus, Upload, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import { uploadCardImage, ALLOWED_IMAGE_TYPES } from '@/lib/supabase/storage'
import { useCardSortCards, useCardSortSettings, useCardSortActions } from '@/stores/study-builder'
import { SortableCardItem, InlineCardEditForm, EditCardDialog } from '../components'
import type { CardImage } from '@veritio/study-types'

const DROP_HIGHLIGHT_CLASSES = ['border-primary', 'bg-primary/5']

function ImageDropZone({
  image,
  onClear,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  compact,
}: {
  image: CardImage | null
  onClear: (e: React.MouseEvent) => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  compact?: boolean
}) {
  const size = compact ? 'w-10 h-10' : 'w-[108px] h-[108px]'
  const clearSize = compact ? 'h-4 w-4 -right-1.5 -top-1.5' : 'h-5 w-5 -right-2 -top-2'
  const clearIconSize = compact ? 'h-2.5 w-2.5' : 'h-3 w-3'

  return (
    <div className="flex-shrink-0 relative">
      <input type="file" accept={ALLOWED_IMAGE_TYPES.join(',')} onChange={onFileSelect} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
      <div
        className={`${size} border-2 border-dashed border-muted-foreground/30 rounded-lg flex ${compact ? '' : 'flex-col '}items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {image?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt="Card image" className="w-full h-full object-cover rounded-md" />
        ) : compact ? (
          <Upload className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs text-muted-foreground mt-1.5 group-hover:text-primary transition-colors">Add Image</span>
          </>
        )}
      </div>
      {image?.url && (
        <Button type="button" variant="destructive" size="icon" className={`absolute ${clearSize} z-20`} onClick={onClear}>
          <X className={clearIconSize} />
        </Button>
      )}
    </div>
  )
}

interface CardsSectionProps {
  studyId: string
}

export function CardsSection({ studyId }: CardsSectionProps) {
  const cards = useCardSortCards()
  const settings = useCardSortSettings()
  const { addCard, updateCard, removeCard, reorderCards, setSettings } = useCardSortActions()
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [editDialogCardId, setEditDialogCardId] = useState<string | null>(null)
  const [newCardLabel, setNewCardLabel] = useState('')
  const [newCardDescription, setNewCardDescription] = useState('')
  const [newCardImage, setNewCardImage] = useState<CardImage | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyboardAddCard = () => {
      inputRef.current?.focus()
    }

    const handleKeyboardDeleteCard = () => {
      if (selectedCardId) {
        removeCard(selectedCardId)
        setSelectedCardId(null)
      }
    }

    const handleKeyboardNextCard = () => {
      if (cards.length === 0) return
      const currentIndex = cards.findIndex((c) => c.id === selectedCardId)
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % cards.length
      setSelectedCardId(cards[nextIndex].id)
    }

    const handleKeyboardPreviousCard = () => {
      if (cards.length === 0) return
      const currentIndex = cards.findIndex((c) => c.id === selectedCardId)
      const prevIndex = currentIndex === -1 ? cards.length - 1 : (currentIndex - 1 + cards.length) % cards.length
      setSelectedCardId(cards[prevIndex].id)
    }

    window.addEventListener('builder:add-card', handleKeyboardAddCard)
    window.addEventListener('builder:delete-card', handleKeyboardDeleteCard)
    window.addEventListener('builder:next-card', handleKeyboardNextCard)
    window.addEventListener('builder:previous-card', handleKeyboardPreviousCard)

    return () => {
      window.removeEventListener('builder:add-card', handleKeyboardAddCard)
      window.removeEventListener('builder:delete-card', handleKeyboardDeleteCard)
      window.removeEventListener('builder:next-card', handleKeyboardNextCard)
      window.removeEventListener('builder:previous-card', handleKeyboardPreviousCard)
    }
  }, [selectedCardId, cards, removeCard])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const result = await uploadCardImage(studyId, 'new', file)
        setNewCardImage({ url: result.url, filename: result.filename })
      } catch { /* Error handling */ }
      e.target.value = ''
    }
  }

  const handleDropZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add(...DROP_HIGHLIGHT_CLASSES)
  }

  const handleDropZoneDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove(...DROP_HIGHLIGHT_CLASSES)
  }

  const handleDropZoneDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove(...DROP_HIGHLIGHT_CLASSES)
    const file = e.dataTransfer.files[0]
    if (file && ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
      uploadCardImage(studyId, 'new', file).then((result) => setNewCardImage({ url: result.url, filename: result.filename }))
    }
  }

  const clearNewImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setNewCardImage(null)
  }


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

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault()
    if (newCardLabel.trim()) {
      addCard({
        study_id: studyId,
        label: newCardLabel.trim(),
        description: newCardDescription.trim() || null,
        position: cards.length,
        image: newCardImage,
      })
      setNewCardLabel('')
      setNewCardDescription('')
      setNewCardImage(null)
    }
  }

  const handleUpdateCard = (cardId: string, label: string) => {
    updateCard(cardId, { label })
    setEditingCardId(null)
  }

  const handleEditDialogSave = (updates: { label: string; description: string | null; image: CardImage | null }) => {
    if (editDialogCardId) {
      updateCard(editDialogCardId, updates)
      setEditDialogCardId(null)
    }
  }

  const handleImageUpdate = (cardId: string, image: CardImage | null) => {
    updateCard(cardId, { image: image || undefined })
  }

  const handleDeleteAll = () => {
    cards.forEach((card) => removeCard(card.id))
  }

  const showImages = settings.showCardImages === true
  const showDescriptions = settings.showCardDescriptions === true

  return (
    <section className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Cards</Label>
          <p className="text-sm text-muted-foreground">Items for participants to sort</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Descriptions</span>
            <Switch
              checked={showDescriptions}
              onCheckedChange={(checked) => setSettings({ showCardDescriptions: checked })}
              className="h-5"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Images</span>
            <Switch
              checked={showImages}
              onCheckedChange={(checked) => setSettings({ showCardImages: checked })}
              className="h-5"
            />
          </div>
          {cards.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteAllConfirm(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete all
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete all cards</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <form onSubmit={handleAddCard} className="mt-4 border rounded-lg p-3">
        <div className={showImages && showDescriptions ? 'space-y-3' : showDescriptions ? 'space-y-2' : 'flex gap-3 items-center'}>
          {showImages && showDescriptions ? (
            <div className="flex gap-3">
              <ImageDropZone
                image={newCardImage}
                onClear={clearNewImage}
                onFileSelect={handleFileSelect}
                onDragOver={handleDropZoneDragOver}
                onDragLeave={handleDropZoneDragLeave}
                onDrop={handleDropZoneDrop}
              />
              <div className="flex-1 space-y-2">
                <Input ref={inputRef} placeholder="Card label (required)" value={newCardLabel} onChange={(e) => setNewCardLabel(e.target.value)} />
                <Textarea placeholder="Card Description" value={newCardDescription} onChange={(e) => setNewCardDescription(e.target.value)} rows={2} className="resize-none text-sm" />
              </div>
            </div>
          ) : (
            <>
              {showImages && (
                <ImageDropZone
                  image={newCardImage}
                  onClear={clearNewImage}
                  onFileSelect={handleFileSelect}
                  onDragOver={handleDropZoneDragOver}
                  onDragLeave={handleDropZoneDragLeave}
                  onDrop={handleDropZoneDrop}
                  compact
                />
              )}
              <Input ref={inputRef} placeholder="Card label (required)" value={newCardLabel} onChange={(e) => setNewCardLabel(e.target.value)} className={showDescriptions ? '' : 'flex-1'} />
              {showDescriptions && (
                <Textarea placeholder="Card Description" value={newCardDescription} onChange={(e) => setNewCardDescription(e.target.value)} rows={2} className="resize-none text-sm" />
              )}
            </>
          )}
          <div className={showImages && !showDescriptions ? '' : 'flex justify-end'}>
            <Button type="submit" disabled={!newCardLabel.trim()}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add
              <KeyboardShortcutHint shortcut="enter" variant="dark" className="ml-2" />
            </Button>
          </div>
        </div>
      </form>

      {cards.length > 0 && (
        <ScrollArea className="flex-1 min-h-0 mt-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={cards.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 pr-4">
                {cards.map((card) =>
                  editingCardId === card.id ? (
                    <InlineCardEditForm
                      key={card.id}
                      initialValue={card.label}
                      onSave={(label) => handleUpdateCard(card.id, label)}
                      onCancel={() => setEditingCardId(null)}
                    />
                  ) : (
                    <SortableCardItem
                      key={card.id}
                      card={card}
                      studyId={studyId}
                      isSelected={selectedCardId === card.id}
                      onSelect={() => setSelectedCardId(card.id)}
                      onEdit={(card) => setEditDialogCardId(card.id)}
                      onDelete={removeCard}
                      onImageUpdate={handleImageUpdate}
                    />
                  )
                )}
              </div>
            </SortableContext>
          </DndContext>
        </ScrollArea>
      )}

      {cards.length === 0 && (
        <div className="flex-1 min-h-0 mt-4 rounded-md border border-dashed p-6 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            No cards yet. Type above to add one.
          </p>
        </div>
      )}

      {cards.length > 0 && (
        <p className="text-sm text-muted-foreground mt-3 flex-shrink-0">
          {cards.length} card{cards.length !== 1 ? 's' : ''}
        </p>
      )}

      <EditCardDialog
        card={cards.find((c) => c.id === editDialogCardId) || null}
        studyId={studyId}
        open={editDialogCardId !== null}
        showDescriptions={showDescriptions}
        showImages={showImages}
        onOpenChange={(open) => {
          if (!open) setEditDialogCardId(null)
        }}
        onSave={handleEditDialogSave}
      />

      <ConfirmDialog
        open={showDeleteAllConfirm}
        onOpenChange={setShowDeleteAllConfirm}
        title="Delete all cards?"
        description={`This will permanently delete all ${cards.length} card${cards.length !== 1 ? 's' : ''}. This action cannot be undone.`}
        confirmText="Delete all"
        variant="danger"
        onConfirm={handleDeleteAll}
      />
    </section>
  )
}
