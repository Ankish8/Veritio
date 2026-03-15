'use client'

import { useState, useCallback } from 'react'
import { Editor } from '@tiptap/react'
import { cn } from '@veritio/ui'
import { Button } from '@veritio/ui/components/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@veritio/ui/components/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'
import { AtSign } from 'lucide-react'
import type { StudyFlowQuestion, FlowSection } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { generatePipingReference } from '@veritio/prototype-test/lib/study-flow/answer-piping'

interface RichTextPipingInsertProps {
  editor: Editor | null
  availableQuestions: StudyFlowQuestion[]
  disabled?: boolean
}

const SECTION_LABELS: Record<FlowSection, string> = {
  screening: 'Screening',
  pre_study: 'Pre-study',
  survey: 'Survey',
  post_study: 'Post-study',
}
export function RichTextPipingInsert({
  editor,
  availableQuestions,
  disabled = false,
}: RichTextPipingInsertProps) {
  const [open, setOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const insertPipingReference = useCallback(
    (question: StudyFlowQuestion) => {
      if (!editor) return

      const preview = question.question_text.replace(/<[^>]*>/g, '').slice(0, 50)

      // Check if PipingReference extension is registered by looking for the node type in schema
      const hasPipingExtension = !!editor.schema.nodes.pipingReference

      if (hasPipingExtension) {
        // Insert as styled chip node
        editor.chain().focus().insertContent({
          type: 'pipingReference',
          attrs: {
            questionId: question.id,
            questionTitle: preview,
          },
        }).run()
      } else {
        // Fallback to plain text
        const reference = generatePipingReference(question, true)
        editor.chain().focus().insertContent(reference).run()
      }
      setOpen(false)
    },
    [editor]
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
                size="sm"
                variant="ghost"
                disabled={disabled || !editor}
                className={cn('h-8 gap-1.5 px-2', open && 'bg-muted')}
              >
                <AtSign className="h-4 w-4" />
                <span className="text-xs font-medium">Reference</span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Insert answer from previous question</p>
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
