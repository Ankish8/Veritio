'use client'

import { Input } from '@/components/ui/input'
import { KeyboardHintText } from '../option-keyboard-hint'
import type { TextQuestionConfig, TextInputType } from '@veritio/study-types/study-flow-types'

interface SingleLineTextRendererProps {
  config: TextQuestionConfig
  value: string | undefined
  onChange: (value: string) => void
  showKeyboardHints?: boolean
  onEnterPress?: () => void
  onFocusChange?: (focused: boolean) => void
}

function getHtmlInputType(inputType?: TextInputType): string {
  switch (inputType) {
    case 'numerical':
      return 'number'
    case 'date':
      return 'date'
    case 'email':
      return 'email'
    case 'text':
    default:
      return 'text'
  }
}

function getDefaultPlaceholder(inputType?: TextInputType): string {
  switch (inputType) {
    case 'numerical':
      return 'Enter a number...'
    case 'date':
      return 'Select a date'
    case 'email':
      return 'Enter your email...'
    case 'text':
    default:
      return 'Enter your answer...'
  }
}

export function SingleLineTextRenderer({
  config,
  value,
  onChange,
  showKeyboardHints = false,
  onEnterPress,
  onFocusChange,
}: SingleLineTextRendererProps) {
  const textConfig = config as TextQuestionConfig
  const inputType = textConfig.inputType || 'text'
  const htmlInputType = getHtmlInputType(inputType)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onEnterPress?.()
    }
  }

  // Build input props based on type
  const inputProps: React.InputHTMLAttributes<HTMLInputElement> = {
    type: htmlInputType,
    autoFocus: true,
    placeholder: textConfig.placeholder || getDefaultPlaceholder(inputType),
    value: value || '',
    onKeyDown: handleKeyDown,
    onFocus: () => onFocusChange?.(true),
    onBlur: () => onFocusChange?.(false),
  }

  // Type-specific constraints
  if (inputType === 'text') {
    inputProps.maxLength = textConfig.maxLength
    inputProps.minLength = textConfig.minLength
  } else if (inputType === 'numerical') {
    // Only set min/max if they're valid numbers (not undefined or NaN)
    if (typeof textConfig.minValue === 'number' && !isNaN(textConfig.minValue)) {
      inputProps.min = textConfig.minValue
    }
    if (typeof textConfig.maxValue === 'number' && !isNaN(textConfig.maxValue)) {
      inputProps.max = textConfig.maxValue
    }
    // Allow decimals
    inputProps.step = 'any'
  } else if (inputType === 'date') {
    if (textConfig.minDate) inputProps.min = textConfig.minDate
    if (textConfig.maxDate) inputProps.max = textConfig.maxDate
  }
  // email type uses browser's built-in validation

  return (
    <div className="space-y-2">
      <Input
        {...inputProps}
        onChange={(e) => { if (e.target.value !== (value || '')) onChange(e.target.value) }}
        className={inputType === 'date' ? 'w-full' : undefined}
      />
      {showKeyboardHints && (
        <KeyboardHintText>Press Enter to continue</KeyboardHintText>
      )}
    </div>
  )
}
