'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KeyboardShortcutHint, EscapeHint } from '@/components/ui/keyboard-shortcut-hint'

interface InlineCardEditFormProps {
  initialValue: string
  placeholder?: string
  onSave: (label: string) => void
  onCancel: () => void
}

export function InlineCardEditForm({ initialValue, placeholder = 'Card label', onSave, onCancel }: InlineCardEditFormProps) {
  const [label, setLabel] = useState(initialValue)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (label.trim()) {
      onSave(label.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
      <Input
        placeholder={placeholder}
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
    </form>
  )
}
