'use client'

import { useState, useEffect, useCallback, forwardRef } from 'react'
import { Input } from './input'

export interface BlurSaveInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> {
  value: string
  onValueChange: (value: string) => void
  transform?: (value: string) => string
}
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
