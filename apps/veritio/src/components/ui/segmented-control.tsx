'use client'

/**
 * SegmentedControl
 *
 * A pill-style segmented control for selecting between options.
 * Supports icons, labels, and both controlled and uncontrolled modes.
 *
 * @example
 * const INPUT_TYPES = [
 *   { value: 'text', label: 'Text', icon: Type },
 *   { value: 'number', label: 'Number', icon: Hash },
 * ]
 *
 * <SegmentedControl
 *   options={INPUT_TYPES}
 *   value={selectedType}
 *   onValueChange={setSelectedType}
 * />
 */

import { forwardRef, type ElementRef, type ComponentPropsWithoutRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SegmentedControlOption<T extends string = string> {
  value: T
  label: string
  icon?: LucideIcon
  disabled?: boolean
}

interface SegmentedControlPropsBase<T extends string = string>
  extends Omit<ComponentPropsWithoutRef<'div'>, 'onChange'> {
  options: readonly SegmentedControlOption<T>[]
  value: T
  onValueChange: (value: T) => void
  /** Size variant */
  size?: 'sm' | 'default'
  /** Whether to show icons */
  showIcons?: boolean
  /** Whether to show labels */
  showLabels?: boolean
}

export type SegmentedControlProps<T extends string = string> = SegmentedControlPropsBase<T>

const SegmentedControl = forwardRef<ElementRef<'div'>, SegmentedControlProps>(
  (
    {
      className,
      options,
      value,
      onValueChange,
      size = 'default',
      showIcons = true,
      showLabels = true,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        role="radiogroup"
        className={cn('inline-flex items-center p-1 gap-1 rounded-lg bg-muted', className)}
        {...props}
      >
        {options.map((option) => {
          const isSelected = value === option.value
          const Icon = option.icon

          const handleClick = () => {
            if (!option.disabled) {
              onValueChange(option.value)
            }
          }

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={option.label}
              disabled={option.disabled}
              onClick={handleClick}
              onMouseDown={(e) => {
                // Fallback handler using native mouse events
                // This helps when React's synthetic events are broken due to pointer-events issues
                if (!option.disabled && e.button === 0) {
                  handleClick()
                  e.preventDefault()
                }
              }}
              className={cn(
                'inline-flex items-center justify-center whitespace-nowrap font-medium transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:pointer-events-none disabled:opacity-50',
                size === 'sm'
                  ? 'rounded px-2 py-1 text-xs gap-1'
                  : 'rounded-md px-3 py-1.5 text-sm gap-1.5',
                isSelected
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {showIcons && Icon && (
                <Icon className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
              )}
              {showLabels && option.label}
            </button>
          )
        })}
      </div>
    )
  }
)

SegmentedControl.displayName = 'SegmentedControl'

export { SegmentedControl }
