'use client'

import { cn } from '@/lib/utils'
import { KeyboardHintText } from '../option-keyboard-hint'
import type { YesNoQuestionConfig } from '@veritio/study-types/study-flow-types'
import { Check, X } from 'lucide-react'

interface YesNoQuestionProps {
  config: YesNoQuestionConfig
  value: boolean | undefined
  onChange: (value: boolean) => void
  showKeyboardHints?: boolean
  onSelectionComplete?: () => void
}

export function YesNoQuestion({
  config,
  value,
  onChange,
  showKeyboardHints = false,
  onSelectionComplete,
}: YesNoQuestionProps) {
  const styleType = config.styleType || 'icons'
  const yesLabel = config.yesLabel || 'Yes'
  const noLabel = config.noLabel || 'No'

  const handleSelect = (selectedValue: boolean) => {
    onChange(selectedValue)
    onSelectionComplete?.()
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
            value === true
              ? 'border-transparent bg-green-50'
              : 'border-muted'
          )}
        >
          <div
            className={cn(
              'w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors',
              value === true ? 'bg-green-500' : 'bg-green-100'
            )}
          >
            {styleType === 'icons' ? (
              <Check
                className={cn(
                  'w-6 h-6 sm:w-7 sm:h-7',
                  value === true ? 'text-white' : 'text-green-600'
                )}
                strokeWidth={3}
              />
            ) : (
              <span className="text-2xl sm:text-3xl">
                {value === true ? '😊' : '🙂'}
              </span>
            )}
          </div>
          <span
            className={cn(
              'text-sm sm:text-base font-medium',
              value === true ? 'text-green-700' : 'text-foreground'
            )}
          >
            {yesLabel}
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
            value === false
              ? 'border-transparent bg-red-50'
              : 'border-muted'
          )}
        >
          <div
            className={cn(
              'w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors',
              value === false ? 'bg-red-500' : 'bg-red-100'
            )}
          >
            {styleType === 'icons' ? (
              <X
                className={cn(
                  'w-6 h-6 sm:w-7 sm:h-7',
                  value === false ? 'text-white' : 'text-red-600'
                )}
                strokeWidth={3}
              />
            ) : (
              <span className="text-2xl sm:text-3xl">
                {value === false ? '😞' : '😕'}
              </span>
            )}
          </div>
          <span
            className={cn(
              'text-sm sm:text-base font-medium',
              value === false ? 'text-red-700' : 'text-foreground'
            )}
          >
            {noLabel}
          </span>
        </button>
      </div>

      {/* Keyboard hints */}
      {showKeyboardHints && (
        <KeyboardHintText>Press A for {yesLabel}, B for {noLabel}</KeyboardHintText>
      )}
    </div>
  )
}
