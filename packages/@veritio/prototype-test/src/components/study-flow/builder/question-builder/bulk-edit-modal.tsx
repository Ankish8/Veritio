'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@veritio/ui'
import { Button } from '@veritio/ui'
import { Textarea } from '@veritio/ui'
import { Alert, AlertDescription } from '@veritio/ui'
import { KeyboardShortcutHint, EscapeHint } from '@veritio/ui'
import { AlertTriangle, Plus, Minus, Check } from 'lucide-react'
import type { ChoiceOption, BranchingLogic } from '../../../../lib/supabase/study-flow-types'
import {
  parseBulkEditText,
  optionsToBulkEditText,
  filterBranchingRulesForOptions,
  getBulkEditChanges,
  validateBulkEditText,
} from '@veritio/prototype-test/lib/study-flow/bulk-edit-parser'

interface BulkEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: ChoiceOption[]
  branchingLogic: BranchingLogic | null | undefined
  onSave: (newOptions: ChoiceOption[], newLogic: BranchingLogic | null) => void
}
export function BulkEditModal({
  open,
  onOpenChange,
  options,
  branchingLogic,
  onSave,
}: BulkEditModalProps) {
  const [text, setText] = useState('')
  const [validation, setValidation] = useState<{
    isValid: boolean
    error?: string
    lineCount: number
  }>({ isValid: true, lineCount: 0 })
  const [preview, setPreview] = useState<{
    added: number
    removed: number
    preserved: number
    hasLogicLoss: boolean
  } | null>(null)

  // Initialize text when modal opens
  useEffect(() => {
    if (open) {
      setText(optionsToBulkEditText(options))
    }
  }, [open, options])

  // Update preview and validation on text change
  useEffect(() => {
    const validationResult = validateBulkEditText(text)
    setValidation(validationResult)

    if (validationResult.isValid) {
      const newOptions = parseBulkEditText(text, options)
      const changes = getBulkEditChanges(options, newOptions)

      // Check if any removed options had branching logic
      const hasLogicLoss =
        branchingLogic?.rules.some((rule) =>
          changes.removedOptions.some((opt) => opt.id === rule.optionId)
        ) || false

      setPreview({
        added: changes.added,
        removed: changes.removed,
        preserved: changes.preserved,
        hasLogicLoss,
      })
    } else {
      setPreview(null)
    }
  }, [text, options, branchingLogic])

  const handleSave = useCallback(() => {
    if (!validation.isValid) return

    const newOptions = parseBulkEditText(text, options)
    const newLogic = filterBranchingRulesForOptions(branchingLogic, newOptions)

    onSave(newOptions, newLogic)
    onOpenChange(false)
  }, [validation.isValid, text, options, branchingLogic, onSave, onOpenChange])

  const handleCancel = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  // Keyboard shortcuts: Cmd/Ctrl+Enter to save, Esc to cancel
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter to save
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handleSave])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Edit Options</DialogTitle>
          <DialogDescription>
            Enter each option on a new line. You can paste a list to quickly add
            multiple options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Option 1&#10;Option 2&#10;Option 3"
            className="min-h-[200px] font-mono text-sm"
            autoFocus
          />

          {/* Validation Error */}
          {!validation.isValid && validation.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{validation.error}</AlertDescription>
            </Alert>
          )}

          {/* Changes Preview */}
          {validation.isValid && preview && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-sm font-medium">Preview of changes:</p>
              <div className="flex flex-wrap gap-4 text-sm">
                {preview.added > 0 && (
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <Plus className="h-3.5 w-3.5" />
                    {preview.added} new
                  </span>
                )}
                {preview.removed > 0 && (
                  <span className="flex items-center gap-1.5 text-red-600">
                    <Minus className="h-3.5 w-3.5" />
                    {preview.removed} removed
                  </span>
                )}
                {preview.preserved > 0 && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Check className="h-3.5 w-3.5" />
                    {preview.preserved} unchanged
                  </span>
                )}
              </div>

              {preview.hasLogicLoss && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Some removed options have branching logic configured. This
                    logic will be lost.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Help Text */}
          <p className="text-xs text-muted-foreground">
            {validation.lineCount} option{validation.lineCount !== 1 ? 's' : ''}{' '}
            detected. Minimum 2 required.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
            <EscapeHint />
          </Button>
          <Button onClick={handleSave} disabled={!validation.isValid}>
            Save Changes
            <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
