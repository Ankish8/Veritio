'use client'

import { CornerDownLeft } from 'lucide-react'
import { usePlatform } from '@veritio/ui'
import { cn } from '@/lib/utils'

type ShortcutType = 'cmd-enter' | 'escape' | 'enter'
type ShortcutVariant = 'light' | 'dark'

interface KeyboardShortcutHintProps {
  /** The keyboard shortcut to display */
  shortcut: ShortcutType
  /** Visual variant - 'light' for outline buttons, 'dark' for primary/filled buttons */
  variant?: ShortcutVariant
  /** Additional CSS classes */
  className?: string
}

/**
 * Displays styled keyboard shortcut hints inside buttons.
 * Automatically detects platform to show ⌘ (Mac) or Ctrl (Windows/Linux).
 * Hidden on mobile screens.
 *
 * @example
 * ```tsx
 * <Button>
 *   Save
 *   <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />
 * </Button>
 * ```
 */
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

  // Variant-specific styles.
  //
  // Neither variant may hardcode a colour. These badges sit inside buttons
  // whose foreground is theme- and brand-dependent: a participant study with a
  // near-black brand resolves --brand to white in dark mode, so the old
  // `text-white` on `bg-white/20` rendered a white badge on a white button.
  // `currentColor` inherits whatever the host button already uses for its
  // label, which is correct on branded, primary and outline buttons alike.
  const kbdStyles = {
    light: cn(
      kbdBase,
      'px-1.5 py-0.5',
      'bg-muted border border-border text-muted-foreground'
    ),
    dark: cn(
      kbdBase,
      'w-5 h-5',
      'bg-current/20 border border-current/30'
    ),
  }

  const wrapperClass = cn(
    'ml-2 hidden sm:inline-flex items-center gap-1',
    className
  )

  if (shortcut === 'escape') {
    return (
      <kbd className={cn(kbdStyles[variant], 'hidden sm:inline-flex px-1.5 py-0.5', className)}>
        Esc
      </kbd>
    )
  }

  if (shortcut === 'enter') {
    return (
      <kbd className={cn(kbdStyles[variant], 'hidden sm:inline-flex', className)}>
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

/**
 * Inline escape hint for cancel buttons (doesn't have the ml-2 wrapper).
 * Use when you want just the Esc badge without spacing.
 */
export function EscapeHint({
  variant = 'light',
  className,
}: {
  variant?: ShortcutVariant
  className?: string
}) {
  // Same reasoning as KeyboardShortcutHint: inherit the host button's colour
  // rather than assuming a dark filled button or a light surface.
  const kbdStyles = {
    light: cn(
      'inline-flex items-center justify-center text-xs rounded font-mono px-1.5 py-0.5',
      'bg-muted border border-border text-muted-foreground'
    ),
    dark: cn(
      'inline-flex items-center justify-center text-xs rounded font-mono px-1.5 py-0.5',
      'bg-current/20 border border-current/30'
    ),
  }

  return (
    <kbd className={cn('ml-2 hidden sm:inline-flex', kbdStyles[variant], className)}>
      Esc
    </kbd>
  )
}
