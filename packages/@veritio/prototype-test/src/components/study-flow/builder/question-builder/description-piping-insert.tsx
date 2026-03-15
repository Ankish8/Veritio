'use client'

import { useState, useCallback, RefObject } from 'react'
import { cn } from '@veritio/ui'
import { Button } from '@veritio/ui'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@veritio/ui'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui'
import { AtSign } from 'lucide-react'
import type { StudyFlowQuestion, FlowSection } from '../../../../lib/supabase/study-flow-types'

interface DescriptionPipingInsertProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (newValue: string) => void
  availableQuestions: StudyFlowQuestion[]
  disabled?: boolean
}

const SECTION_LABELS: Record<FlowSection, string> = {
  screening: 'Screening',
  pre_study: 'Pre-study',
  survey: 'Survey',
  post_study: 'Post-study',
}
export function DescriptionPipingInsert({
  textareaRef,
  value,
  onChange,
  availableQuestions,
  disabled = false,
}: DescriptionPipingInsertProps) {
  const [open, setOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const insertPipingReference = useCallback(
    (question: StudyFlowQuestion) => {
      // Use readable format: [[Answer: "Question text"]]
      // The parser will match by question text
      const preview = question.question_text.replace(/<[^>]*>/g, '').trim()
      const reference = `[[Answer: "${preview}"]]`
      const textarea = textareaRef.current

      if (textarea) {
        const start = textarea.selectionStart || 0
        const end = textarea.selectionEnd || 0
        const newValue = value.slice(0, start) + reference + value.slice(end)
        onChange(newValue)

        setTimeout(() => {
          textarea.focus()
          const newPos = start + reference.length
          textarea.setSelectionRange(newPos, newPos)
        }, 0)
      } else {
        onChange(value + reference)
      }

      setOpen(false)
    },
    [textareaRef, value, onChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (availableQuestions.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, availableQuestions.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (availableQuestions[selectedIndex]) {
            insertPipingReference(availableQuestions[selectedIndex])
          }
          break
        case 'Escape':
          setOpen(false)
          break
      }
    },
    [availableQuestions, selectedIndex, insertPipingReference]
  )

  const hasQuestions = availableQuestions.length > 0

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) setSelectedIndex(0)
    }}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled || !hasQuestions}
                className={cn('h-7 gap-1 px-2', open && 'bg-muted')}
              >
                <AtSign className="h-3.5 w-3.5" />
                <span className="text-xs">Reference</span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{hasQuestions ? 'Insert answer from previous question' : 'No previous questions available'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        className="w-[280px] p-0"
        align="start"
        sideOffset={4}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b">
          <p className="text-sm font-medium">Insert previous answer</p>
        </div>

        {/* List */}
        <div className="max-h-[240px] overflow-y-auto py-1">
          {availableQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4 px-3">
              No previous questions
            </p>
          ) : (
            availableQuestions.map((question, index) => {
              const preview = question.question_text.replace(/<[^>]*>/g, '')
              const truncated = preview.length > 35 ? preview.slice(0, 35) + '...' : preview

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => insertPipingReference(question)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm',
                    index === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                  )}
                >
                  <span className="block truncate">{truncated || 'Untitled'}</span>
                  <span className="text-xs text-muted-foreground">
                    {SECTION_LABELS[question.section]}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
