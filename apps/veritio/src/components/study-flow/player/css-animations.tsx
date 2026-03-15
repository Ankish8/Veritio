'use client'

/**
 * Lightweight CSS-based animation replacements for framer-motion.
 * These components provide the same visual effects without the ~40KB JS overhead
 * of framer-motion in the participant critical render path.
 */

import type { ReactNode, CSSProperties } from 'react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// StepTransition: Replaces AnimatePresence + motion.div for step transitions
// ============================================================================

interface StepTransitionProps {
  /** Unique key for the current step — changing it triggers exit→enter */
  stepKey: string
  children: ReactNode
  className?: string
}

/**
 * CSS-based replacement for `<AnimatePresence mode="wait"><motion.div key={step}>`.
 * Handles exit (fade+slide-left) then enter (fade+slide-right) transitions.
 */
export function StepTransition({ stepKey, children, className }: StepTransitionProps) {
  const [displayedKey, setDisplayedKey] = useState(stepKey)
  const [displayedChildren, setDisplayedChildren] = useState(children)
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter')
  const containerRef = useRef<HTMLDivElement>(null)
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Complete exit → enter swap (shared by onTransitionEnd and safety timeout)
  const completeExit = useCallback(() => {
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current)
      safetyTimeoutRef.current = null
    }
    setDisplayedKey(stepKey)
    setDisplayedChildren(children)
    setPhase('enter')
  }, [stepKey, children])

  useEffect(() => {
    if (stepKey !== displayedKey) {
      // Start exit animation
      setPhase('exit') // eslint-disable-line react-hooks/set-state-in-effect

      // Safety timeout: if onTransitionEnd never fires (e.g., same-frame style change,
      // Fast Refresh, or element not painted), force the enter phase after 400ms
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current)
      safetyTimeoutRef.current = setTimeout(() => {
        safetyTimeoutRef.current = null
        setDisplayedKey(stepKey)
        setDisplayedChildren(children)
        setPhase('enter')
      }, 400)
    }
    return () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current)
        safetyTimeoutRef.current = null
      }
    }
  }, [stepKey, displayedKey, children])

  // Recovery: if stepKey reverted back to displayedKey while exit was in progress,
  // the safety timeout was cleared by cleanup but phase is stuck at 'exit'.
  // Immediately recover to 'enter' phase.
  useEffect(() => {
    if (phase === 'exit' && stepKey === displayedKey && !safetyTimeoutRef.current) {
      setPhase('enter') // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [phase, stepKey, displayedKey])

  const handleTransitionEnd = useCallback((e: React.TransitionEvent) => {
    // Only handle transitions on the container itself, not children
    if (e.target !== containerRef.current) return

    if (phase === 'exit') {
      completeExit()
    }
  }, [phase, completeExit])

  // Update children if key hasn't changed (normal re-renders)
  useEffect(() => {
    if (stepKey === displayedKey) {
      setDisplayedChildren(children) // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [children, stepKey, displayedKey])

  return (
    <div
      ref={containerRef}
      className={cn(
        'step-transition',
        phase === 'exit' ? 'step-exit' : 'step-enter',
        className
      )}
      onTransitionEnd={handleTransitionEnd}
      style={{
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        ...(phase === 'exit'
          ? { opacity: 0, transform: 'translateX(-20px)' }
          : { opacity: 1, transform: 'translateX(0)' }
        ),
      }}
    >
      {displayedChildren}
    </div>
  )
}

// ============================================================================
// FadeIn: Replaces motion.div with initial/animate fade+slide
// ============================================================================

interface FadeInProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** Delay in seconds (e.g. 0.1, 0.2) */
  delay?: number
  /** Duration in seconds (default 0.4) */
  duration?: number
  /** Direction to slide from (default 'up') */
  direction?: 'up' | 'down' | 'none'
  /** Distance in px (default 10) */
  distance?: number
  /** Enable hover lift effect */
  hoverLift?: boolean
  /** Ref forwarding */
  ref?: React.Ref<HTMLDivElement>
  /** Role for accessibility */
  role?: string
  /** aria-labelledby */
  'aria-labelledby'?: string
  /** aria-current */
  'aria-current'?: 'step' | undefined
}

/**
 * CSS-based replacement for:
 * `<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} ...>`
 */
export function FadeIn({
  children,
  className,
  style,
  delay = 0,
  duration = 0.4,
  direction = 'up',
  distance = 10,
  hoverLift = false,
  ref,
  role,
  'aria-labelledby': ariaLabelledby,
  'aria-current': ariaCurrent,
}: FadeInProps) {
  const translateYMap = { up: `${distance}px`, down: `-${distance}px`, none: '0' }
  const translateY = translateYMap[direction]

  return (
    <div
      ref={ref}
      className={cn(
        hoverLift && 'transition-shadow transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-md',
        className,
      )}
      role={role}
      aria-labelledby={ariaLabelledby}
      aria-current={ariaCurrent}
      style={{
        animation: `fadeSlideIn ${duration}s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s both`,
        '--fade-translate-y': translateY,
        ...style,
      } as CSSProperties}
    >
      {children}
    </div>
  )
}

// ============================================================================
// ButtonBounce: Replaces motion.div button press animation
// ============================================================================

interface ButtonBounceProps {
  children: ReactNode
  isActive: boolean
  className?: string
}

/**
 * CSS-based replacement for the Typeform-style button bounce:
 * `<motion.div animate={isTransitioning ? { scale: [1, 0.97, 1.01, 1] } : {}}>`
 */
export function ButtonBounce({ children, isActive, className }: ButtonBounceProps) {
  return (
    <div
      className={cn(isActive && 'animate-button-bounce', className)}
      style={isActive ? { animation: 'buttonBounce 0.25s ease-out' } : undefined}
    >
      {children}
    </div>
  )
}

// ============================================================================
// Global CSS keyframes (injected once via <style> tag)
// ============================================================================

/**
 * Injects the CSS keyframes needed by all animation components.
 * Render once at the top level (e.g. in StudyFlowPlayer).
 */
export function AnimationStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(var(--fade-translate-y, 10px));
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes buttonBounce {
  0% { transform: scale(1); }
  30% { transform: scale(0.97); }
  70% { transform: scale(1.01); }
  100% { transform: scale(1); }
}
`,
      }}
    />
  )
}
