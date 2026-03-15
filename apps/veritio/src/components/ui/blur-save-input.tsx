'use client'

import { useState, useEffect, useCallback, forwardRef } from 'react'
import { Input } from './input'

export interface BlurSaveInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> {
  /** The controlled value from store/parent */
  value: string
  /** Called on blur with the final value - use this to update your store */
  onValueChange: (value: string) => void
  /** Optional transform function applied on each keystroke (e.g., lowercase, sanitize) */
  transform?: (value: string) => string
}

/**
 * Input that saves on blur instead of every keystroke.
 * Use this to prevent auto-save from triggering while typing.
 *
 * @example
 * <BlurSaveInput
 *   value={meta.urlSlug || ''}
 *   onValueChange={(v) => setUrlSlug(v || null)}
 *   transform={(v) => v.toLowerCase().replace(/[^a-z0-9-]/g, '')}
 *   placeholder="my-study"
 * />
 */
export const BlurSaveInput = forwardRef<HTMLInputElement, BlurSaveInputProps>(
  ({ value, onValueChange, transform, onBlur, ...props }, ref) => {
    const [localValue, setLocalValue] = useState(value)

    // Sync local state when external value changes (e.g., API load)
    useEffect(() => {
      setLocalValue(value)
    }, [value])

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = transform ? transform(e.target.value) : e.target.value
        setLocalValue(newValue)
      },
      [transform]
    )

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        // Only update store if value actually changed
        if (localValue !== value) {
          onValueChange(localValue)
        }
        // Call original onBlur if provided
        onBlur?.(e)
      },
      [localValue, value, onValueChange, onBlur]
    )

    return (
      <Input
        ref={ref}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    )
  }
)

BlurSaveInput.displayName = 'BlurSaveInput'
