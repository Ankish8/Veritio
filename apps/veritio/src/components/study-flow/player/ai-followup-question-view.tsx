'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Loader2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useBrandingContext } from './branding-provider'
import type { FollowupQuestionType, FollowupQuestionConfig } from '@veritio/study-types/study-flow-types'

interface AiFollowupQuestionViewProps {
  question: string
  followupType?: FollowupQuestionType
  followupConfig?: FollowupQuestionConfig | null
  onSubmit: (response: unknown) => void
  onAnswerChange?: (answer: string) => void
  isEvaluating?: boolean
}

export function AiFollowupQuestionView({
  question,
  followupType = 'text',
  followupConfig,
  onSubmit,
  onAnswerChange,
  isEvaluating,
}: AiFollowupQuestionViewProps) {
  if (isEvaluating) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center animate-in fade-in duration-300">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">
          Preparing a follow-up question...
        </span>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
      {/* Question text — matches native question-renderer styling */}
      <div className="flex items-start gap-2">
        <Sparkles className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
        <p className="text-lg md:text-xl font-medium text-foreground">
          {question}
        </p>
      </div>

      {followupType === 'text' && <TextFollowup onSubmit={onSubmit} onAnswerChange={onAnswerChange} question={question} />}
      {followupType === 'multiple_choice' && <ChoiceFollowup config={followupConfig} onSubmit={onSubmit} />}
      {followupType === 'opinion_scale' && <ScaleFollowup config={followupConfig} onSubmit={onSubmit} />}
      {followupType === 'yes_no' && <YesNoFollowup onSubmit={onSubmit} />}
    </div>
  )
}

// ============================================================================
// Text follow-up — matches native multi-line-text renderer
// ============================================================================

function TextFollowup({
  onSubmit,
  onAnswerChange,
  question,
}: {
  onSubmit: (response: unknown) => void
  onAnswerChange?: (answer: string) => void
  question: string
}) {
  const [answer, setAnswer] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setAnswer('')
    onAnswerChange?.('')
    textareaRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question])

  return (
    <div className="space-y-2">
      <Textarea
        ref={textareaRef}
        value={answer}
        onChange={(e) => {
          setAnswer(e.target.value)
          onAnswerChange?.(e.target.value)
        }}
        placeholder="Type your answer..."
        rows={4}
        className="resize-none"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && answer.trim()) {
            e.preventDefault()
            onSubmit(answer)
          }
        }}
      />
      <p className="hidden sm:block text-xs text-muted-foreground mt-2">
        Press Enter to continue
      </p>
    </div>
  )
}

// ============================================================================
// Choice follow-up — matches native multiple-choice-question (single-select)
// ============================================================================

function ChoiceFollowup({
  config,
  onSubmit,
}: {
  config?: FollowupQuestionConfig | null
  onSubmit: (response: unknown) => void
}) {
  const options = config?.options ?? []
  const { isActive: isBranded } = useBrandingContext()

  return (
    <RadioGroup
      onValueChange={(optionId) => onSubmit(optionId)}
      className="space-y-3"
    >
      {options.map((option) => (
        <div key={option.id} className="flex items-center space-x-3">
          <RadioGroupItem value={option.id} id={`followup-${option.id}`} className="h-5 w-5" branded={isBranded} />
          <Label htmlFor={`followup-${option.id}`} className="cursor-pointer text-base text-foreground">
            {option.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  )
}

// ============================================================================
// Scale follow-up — matches native opinion-scale-question (numerical)
// ============================================================================

function ScaleFollowup({
  config,
  onSubmit,
}: {
  config?: FollowupQuestionConfig | null
  onSubmit: (response: unknown) => void
}) {
  const [selected, setSelected] = useState<number | undefined>(undefined)
  const scalePoints = config?.scalePoints ?? 5
  const leftLabel = config?.leftLabel
  const rightLabel = config?.rightLabel

  const handleSelect = (n: number) => {
    setSelected(n)
    onSubmit(n)
  }

  return (
    <div className="space-y-4">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${scalePoints}, minmax(44px, 1fr))` }}
      >
        {Array.from({ length: scalePoints }, (_, i) => i + 1).map((n) => {
          const isSelected = selected === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => handleSelect(n)}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl transition-all',
                'min-h-[56px] min-w-[44px] p-2',
                'hover:bg-muted',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1',
                'border',
                isSelected ? 'bg-muted border-transparent' : 'bg-transparent border-border/50'
              )}
            >
              <span className={cn(
                'font-semibold text-lg',
                isSelected ? 'text-primary' : 'text-foreground'
              )}>
                {n}
              </span>
            </button>
          )
        })}
      </div>

      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Yes/No follow-up — matches native yes-no-question (icons style)
// ============================================================================

function YesNoFollowup({ onSubmit }: { onSubmit: (response: unknown) => void }) {
  const [selected, setSelected] = useState<boolean | undefined>(undefined)

  const handleSelect = (value: boolean) => {
    setSelected(value)
    onSubmit(value)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-4 sm:gap-6">
        {/* Yes Button */}
        <button
          type="button"
          onClick={() => handleSelect(true)}
          className={cn(
            'flex flex-col items-center gap-2 p-4 sm:p-6 rounded-xl border-2 transition-all',
            'min-w-[120px] min-h-[100px]',
            'hover:border-green-400 hover:bg-green-50/50',
            'focus:outline-none',
            selected === true
              ? 'border-transparent bg-green-50'
              : 'border-muted'
          )}
        >
          <div
            className={cn(
              'w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors',
              selected === true ? 'bg-green-500' : 'bg-green-100'
            )}
          >
            <Check
              className={cn(
                'w-6 h-6 sm:w-7 sm:h-7',
                selected === true ? 'text-white' : 'text-green-600'
              )}
              strokeWidth={3}
            />
          </div>
          <span
            className={cn(
              'text-sm sm:text-base font-medium',
              selected === true ? 'text-green-700' : 'text-foreground'
            )}
          >
            Yes
          </span>
        </button>

        {/* No Button */}
        <button
          type="button"
          onClick={() => handleSelect(false)}
          className={cn(
            'flex flex-col items-center gap-2 p-4 sm:p-6 rounded-xl border-2 transition-all',
            'min-w-[120px] min-h-[100px]',
            'hover:border-red-400 hover:bg-red-50/50',
            'focus:outline-none',
            selected === false
              ? 'border-transparent bg-red-50'
              : 'border-muted'
          )}
        >
          <div
            className={cn(
              'w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors',
              selected === false ? 'bg-red-500' : 'bg-red-100'
            )}
          >
            <X
              className={cn(
                'w-6 h-6 sm:w-7 sm:h-7',
                selected === false ? 'text-white' : 'text-red-600'
              )}
              strokeWidth={3}
            />
          </div>
          <span
            className={cn(
              'text-sm sm:text-base font-medium',
              selected === false ? 'text-red-700' : 'text-foreground'
            )}
          >
            No
          </span>
        </button>
      </div>
    </div>
  )
}
