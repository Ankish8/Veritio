'use client'

import { type ReactNode, type KeyboardEvent, useState, useEffect, useRef } from 'react'
import { AlertTriangle, Check, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './dialog'
import { Button } from './button'
import {
  KeyboardShortcutHint,
  EscapeHint,
} from './keyboard-shortcut-hint'
import { useKeyboardShortcut } from '../hooks/use-keyboard-shortcut'
import { cn } from '../utils/cn'

interface TypeToDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName: string
  itemType?: string
  title?: string
  description?: ReactNode
  onConfirm: () => void | Promise<void>
  loading?: boolean
}
export function TypeToDeleteDialog({
  open,
  onOpenChange,
  itemName,
  itemType = 'item',
  title,
  description,
  onConfirm,
  loading = false,
}: TypeToDeleteDialogProps) {
  const [inputValue, setInputValue] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const actualLoading = loading || isDeleting

  // Case-insensitive comparison
  const isMatch =
    inputValue.trim().toLowerCase() === itemName.trim().toLowerCase()

  // Reset input when dialog opens/closes
  useEffect(() => {
    if (open) {
      setInputValue('')
      setIsDeleting(false)
      // Auto-focus input after animation completes
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [open])

  const handleConfirm = async () => {
    if (!isMatch || actualLoading) return

    setIsDeleting(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      console.error(`Failed to delete ${itemType}:`, error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Keyboard shortcuts: Cmd+Enter or Enter when matched
  useKeyboardShortcut({
    enabled: open && isMatch && !actualLoading,
    onCmdEnter: handleConfirm,
  })

  // Handle Enter key on input
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && isMatch && !actualLoading) {
      e.preventDefault()
      handleConfirm()
    }
  }

  const displayTitle = title ?? `Delete ${itemType}?`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-semibold">
              {displayTitle}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed">
            {description ?? (
              <>
                This will permanently delete{' '}
                <span className="font-semibold text-foreground">
                  &quot;{itemName}&quot;
                </span>{' '}
                and cannot be undone.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label
            htmlFor="delete-confirm-input"
            className="block text-sm font-medium text-foreground mb-2"
          >
            To confirm, type{' '}
            <span className="font-semibold">&quot;{itemName}&quot;</span> below:
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              id="delete-confirm-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Type "${itemName}"`}
              className={cn(
                'flex h-11 w-full rounded-xl border-2 px-4 py-2 text-sm pr-10',
                'bg-muted text-foreground placeholder:text-muted-foreground',
                'hover:bg-muted/80 focus:bg-muted/80',
                'transition-all duration-200',
                'outline-none focus:outline-none focus-visible:outline-none',
                // Default state
                !inputValue && 'border-transparent focus:border-transparent',
                // Mismatch state (typing but doesn't match yet)
                inputValue &&
                  !isMatch &&
                  'border-red-300 focus:border-red-400',
                // Match state
                isMatch && 'border-green-400 focus:border-green-500',
                // Disabled state
                actualLoading && 'opacity-50 cursor-not-allowed'
              )}
              disabled={actualLoading}
              aria-label="Type item name to confirm deletion"
              aria-describedby="delete-confirm-hint"
            />
            {isMatch && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Check className="w-5 h-5 text-green-600" />
              </div>
            )}
          </div>
          <p
            id="delete-confirm-hint"
            className="text-xs text-muted-foreground mt-2"
          >
            {inputValue.length} / {itemName.length} characters
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={actualLoading}
            className="inline-flex items-center"
          >
            Cancel
            <EscapeHint />
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isMatch || actualLoading}
            aria-label={`Confirm delete ${itemType}`}
            className="inline-flex items-center"
          >
            {actualLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                Delete
                <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  itemName,
  itemType = 'item',
  onConfirm,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName: string
  itemType?: string
  onConfirm: () => void | Promise<void>
  loading?: boolean
}) {
  return (
    <TypeToDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      itemName={itemName}
      itemType={itemType}
      onConfirm={onConfirm}
      loading={loading}
    />
  )
}
