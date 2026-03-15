'use client'

import { CornerDownLeft } from 'lucide-react'
import { usePlatform } from '../hooks/use-platform'
import { cn } from '../utils/cn'

type ShortcutType = 'cmd-enter' | 'escape' | 'enter'
type ShortcutVariant = 'light' | 'dark'

interface KeyboardShortcutHintProps {
  shortcut: ShortcutType
  variant?: ShortcutVariant
  className?: string
}
export function KeyboardShortcutHint({
  shortcut,
  variant = 'light',
  className,
}: KeyboardShortcutHintProps) {
  const { modifierSymbol } = usePlatform()

  // Base styles for kbd elements
  const kbdBase = cn(
    'inline-flex items-center justify-center text-xs rounded font-mono',
    'transition-colors'
  )

  // Variant-specific styles
  const kbdStyles = {
    light: cn(
      kbdBase,
      'px-1.5 py-0.5',
      'bg-muted border border-border text-muted-foreground'
    ),
    dark: cn(
      kbdBase,
      'w-5 h-5',
      'bg-white/20 border border-white/30 text-white'
    ),
  }

  const wrapperClass = cn(
    'ml-2 hidden sm:inline-flex items-center gap-1',
    className
  )

  if (shortcut === 'escape') {
    return (
      <kbd className={cn(kbdStyles[variant], 'px-1.5 py-0.5', className)}>
        Esc
      </kbd>
    )
  }

  if (shortcut === 'enter') {
    return (
      <kbd className={cn(kbdStyles[variant], className)}>
        <CornerDownLeft className="w-3 h-3" />
      </kbd>
    )
  }

  // cmd-enter: Show modifier + enter icon
  return (
    <span className={wrapperClass}>
      <kbd className={kbdStyles[variant]}>{modifierSymbol}</kbd>
      <kbd className={kbdStyles[variant]}>
        <CornerDownLeft className="w-3 h-3" />
      </kbd>
    </span>
  )
}
export function EscapeHint({
  variant = 'light',
  className,
}: {
  variant?: ShortcutVariant
  className?: string
}) {
  const kbdStyles = {
    light: cn(
      'inline-flex items-center justify-center text-xs rounded font-mono px-1.5 py-0.5',
      'bg-muted border border-border text-muted-foreground'
    ),
    dark: cn(
      'inline-flex items-center justify-center text-xs rounded font-mono px-1.5 py-0.5',
      'bg-white/20 border border-white/30 text-white'
    ),
  }

  return (
    <kbd className={cn('ml-2 hidden sm:inline-flex', kbdStyles[variant], className)}>
      Esc
    </kbd>
  )
}
