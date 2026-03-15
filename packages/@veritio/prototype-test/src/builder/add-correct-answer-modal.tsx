'use client'

import { useState, useCallback } from 'react'
import { Target, Route } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  KeyboardShortcutHint,
  EscapeHint,
  useKeyboardShortcut,
  cn,
} from '@veritio/ui'

export type SuccessCriteriaType = 'destination' | 'pathway'

interface AddCorrectAnswerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (type: SuccessCriteriaType) => void
  currentType?: SuccessCriteriaType
}

const criteriaOptions = [
  {
    id: 'pathway' as const,
    icon: Route,
    label: 'Takes a specific pathway',
    description: 'Set the sequence of screens that participants need to take to successfully complete the task',
  },
  {
    id: 'destination' as const,
    icon: Target,
    label: 'Reaches a specific destination',
    description: 'Select the screen that participants need to navigate to to successfully complete the task',
  },
]

export function AddCorrectAnswerModal({
  open,
  onOpenChange,
  onSelect,
  currentType,
}: AddCorrectAnswerModalProps) {
  const [selected, setSelected] = useState<SuccessCriteriaType>(currentType || 'destination')

  const handleCreate = useCallback(() => {
    onSelect(selected)
    onOpenChange(false)
  }, [selected, onSelect, onOpenChange])

  // Keyboard shortcuts: Cmd+Enter to create
  useKeyboardShortcut({
    enabled: open,
    onCmdEnter: handleCreate,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a correct answer</DialogTitle>
          <DialogDescription>
            This task is successful when the participant:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {criteriaOptions.map((option) => {
            const Icon = option.icon
            const isSelected = selected === option.id

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelected(option.id)}
                className={cn(
                  'w-full flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left',
                  'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:bg-muted/50'
                )}
              >
                {/* Radio indicator */}
                <div
                  className={cn(
                    'mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    isSelected ? 'border-primary' : 'border-muted-foreground/30'
                  )}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        'h-4 w-4 flex-shrink-0',
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                    <p
                      className={cn(
                        'font-medium text-sm',
                        isSelected ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {option.label}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
            <EscapeHint />
          </Button>
          <Button onClick={handleCreate}>
            Create
            <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
