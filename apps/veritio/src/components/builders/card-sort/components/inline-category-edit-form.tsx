'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { KeyboardShortcutHint, EscapeHint } from '@/components/ui/keyboard-shortcut-hint'
import type { Category } from '@veritio/study-types'

interface InlineCategoryEditFormProps {
  category: Category
  showDescription?: boolean
  onSave: (label: string, description?: string | null) => void
  onCancel: () => void
}

export function InlineCategoryEditForm({
  category,
  showDescription,
  onSave,
  onCancel,
}: InlineCategoryEditFormProps) {
  const [label, setLabel] = useState(category.label)
  const [description, setDescription] = useState(category.description ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (label.trim()) {
      onSave(label.trim(), showDescription ? (description.trim() || null) : undefined)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border bg-muted/50 p-3">
      {showDescription ? (
        <div className="space-y-2">
          <Input
            placeholder="Category name"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
          />
          <Textarea
            placeholder="Category description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="resize-none text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button type="submit" size="sm" disabled={!label.trim()}>
              <Check className="h-3.5 w-3.5 mr-1" />
              Save
              <KeyboardShortcutHint shortcut="enter" variant="dark" className="ml-1" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
              <EscapeHint className="ml-1" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Category name"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={!label.trim()}>
            <Check className="h-3.5 w-3.5" />
            <KeyboardShortcutHint shortcut="enter" variant="dark" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-3.5 w-3.5" />
            <EscapeHint />
          </Button>
        </div>
      )}
    </form>
  )
}
