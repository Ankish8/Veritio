'use client'

import { useState, useCallback, useRef } from 'react'
import { Sparkles, Loader2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useRefineText, type RefineAction } from '@/hooks/use-refine-text'
import { REFINE_OPTIONS } from './refine-options'

type Phase = 'idle' | 'loading' | 'preview' | 'error'

interface AiRefineButtonProps {
  value: string
  onApply: (refined: string) => void
  context?: string
  disabled?: boolean
  className?: string
}

/**
 * Veritio AI dropdown for plain text fields (title, description).
 * Inline UI: dropdown → loading spinner → Apply/Discard.
 */
export function AiRefineButton({
  value,
  onApply,
  context,
  disabled,
  className,
}: AiRefineButtonProps) {
  const { refine, error, reset } = useRefineText()
  const [phase, setPhase] = useState<Phase>('idle')
  const [_refinedText, setRefinedText] = useState('')
  const originalValueRef = useRef('')

  const isEmpty = !value?.trim()

  const handleAction = useCallback(async (action: RefineAction) => {
    originalValueRef.current = value
    setRefinedText('')
    setPhase('loading')

    const res = await refine({ text: value, action, format: 'plain', context })
    if (res) {
      setRefinedText(res.refined)
      // Preview in the field immediately
      onApply(res.refined)
      setPhase('preview')
    } else {
      setPhase('error')
    }
  }, [refine, value, context, onApply])

  const handleApply = useCallback(() => {
    // Already applied during preview, just reset state
    setPhase('idle')
  }, [])

  const handleDiscard = useCallback(() => {
    onApply(originalValueRef.current)
    setPhase('idle')
    reset()
  }, [onApply, reset])

  if (phase === 'loading') {
    return (
      <div className="flex items-center gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Refining...</span>
      </div>
    )
  }

  if (phase === 'preview') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Uses AI. Verify results.</span>
        <Button size="sm" className="h-6 px-2 text-xs gap-1" onClick={handleApply}>
          <Check className="h-3 w-3" />
          Apply
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1" onClick={handleDiscard}>
          <X className="h-3 w-3" />
          Discard
        </Button>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-destructive truncate max-w-40">{error || 'Failed'}</span>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleDiscard}>
          Dismiss
        </Button>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-6 gap-1 px-1.5 text-xs text-muted-foreground hover:text-foreground', className)}
          disabled={disabled || isEmpty}
          aria-label="Veritio AI"
        >
          <Sparkles className="h-3 w-3" />
          Veritio AI
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {REFINE_OPTIONS.map(({ action, label, icon: Icon }) => (
          <DropdownMenuItem
            key={action}
            onClick={() => handleAction(action)}
            className="gap-2 text-xs"
          >
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
