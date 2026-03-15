'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { KeyboardShortcutHint, EscapeHint } from '@/components/ui/keyboard-shortcut-hint'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'
import { CardImageUpload } from '../card-image-upload'
import type { CardWithImage, CardImage } from '@veritio/study-types'

interface EditCardDialogProps {
  card: CardWithImage | null
  studyId: string
  open: boolean
  showDescriptions?: boolean
  showImages?: boolean
  onOpenChange: (open: boolean) => void
  onSave: (updates: { label: string; description: string | null; image: CardImage | null }) => void
}

export function EditCardDialog({
  card,
  studyId,
  open,
  showDescriptions = true,
  showImages = true,
  onOpenChange,
  onSave,
}: EditCardDialogProps) {
  const [label, setLabel] = useState(card?.label ?? '')
  const [description, setDescription] = useState(card?.description ?? '')
  const [image, setImage] = useState<CardImage | null>(card?.image ?? null)

  useEffect(() => {
    if (open && card) {
      setLabel(card.label) // eslint-disable-line react-hooks/set-state-in-effect
      setDescription(card.description ?? '')
      setImage(card.image ?? null)
    }
  }, [open, card])

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
  }

  const handleSave = useCallback(() => {
    if (label.trim()) {
      onSave({
        label: label.trim(),
        description: description.trim() || null,
        image,
      })
      onOpenChange(false)
    }
  }, [label, description, image, onSave, onOpenChange])

  useKeyboardShortcut({
    enabled: open && !!label.trim(),
    onCmdEnter: handleSave,
  })

  if (!card) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Card</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {showImages && (
            <CardImageUpload
              studyId={studyId}
              cardId={card.id}
              image={image}
              onChange={setImage}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="card-label">Label</Label>
            <Input
              id="card-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Card label"
            />
          </div>

          {showDescriptions && (
            <div className="space-y-2">
              <Label htmlFor="card-description">Description (optional)</Label>
              <Textarea
                id="card-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for this card"
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
            <EscapeHint />
          </Button>
          <Button onClick={handleSave} disabled={!label.trim()}>
            Save Changes
            <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
