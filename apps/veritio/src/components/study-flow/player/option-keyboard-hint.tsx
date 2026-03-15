'use client'

import { cn } from '@/lib/utils'

interface OptionKeyboardHintProps {
  hint: string
  selected?: boolean
  branded?: boolean
  className?: string
}

export function OptionKeyboardHint({
  hint,
  selected = false,
  branded = false,
  className,
}: OptionKeyboardHintProps) {
  return (
    <kbd
      className={cn(
        // Base styles
        'hidden sm:inline-flex items-center justify-center',
        'min-w-5 h-5 px-1 rounded text-xs font-mono font-medium',
        'border transition-colors select-none',
        // Color states - use brand colors when branded
        selected
          ? branded
            ? 'bg-brand-subtle border-brand-light text-brand'
            : 'bg-primary/10 border-primary/30 text-primary'
          : 'bg-muted border-border text-muted-foreground',
        className
      )}
    >
      {hint}
    </kbd>
  )
}

interface KeyboardHintTextProps {
  children: React.ReactNode
  className?: string
}

export function KeyboardHintText({ children, className }: KeyboardHintTextProps) {
  return (
    <p
      className={cn(
        'hidden sm:block text-xs text-muted-foreground mt-2',
        className
      )}
    >
      {children}
    </p>
  )
}
