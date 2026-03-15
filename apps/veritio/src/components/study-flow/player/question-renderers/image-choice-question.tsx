'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OptionKeyboardHint } from '../option-keyboard-hint'
import { getKeyboardHint } from '@/lib/study-flow/keyboard-handlers'
import { useBrandingContext } from '../branding-provider'
import type {
  ImageChoiceQuestionConfig,
  SingleChoiceResponseValue,
  MultiChoiceResponseValue,
  ResponseValue,
} from '@veritio/study-types/study-flow-types'

type ImageChoiceValue = SingleChoiceResponseValue | MultiChoiceResponseValue

interface ImageChoiceQuestionProps {
  config: ImageChoiceQuestionConfig
  value: ResponseValue | undefined
  onChange: (value: ImageChoiceValue) => void
  showKeyboardHints?: boolean
  onSelectionComplete?: () => void
}

export function ImageChoiceQuestion({
  config,
  value,
  onChange,
  showKeyboardHints = false,
  onSelectionComplete,
}: ImageChoiceQuestionProps) {
  const [otherText, setOtherText] = useState('')
  const { isActive: isBranded } = useBrandingContext()
  const mode = config.mode || 'single'
  const gridColumns = config.gridColumns || 3
  const showLabels = config.showLabels !== false

  // Shuffle options if configured (memoized to prevent re-shuffle on re-render)
  const displayOptions = useMemo(() => {
    const opts = config.options || []
    if (config.shuffle) {
      return [...opts].sort(() => Math.random() - 0.5) // eslint-disable-line react-hooks/purity
    }
    return opts
  }, [config.options, config.shuffle])

  // Grid column classes based on configuration
  const gridClass = useMemo(() => {
    switch (gridColumns) {
      case 2:
        return 'grid-cols-2'
      case 4:
        return 'grid-cols-2 sm:grid-cols-4'
      case 3:
      default:
        return 'grid-cols-2 sm:grid-cols-3'
    }
  }, [gridColumns])

  // Single-select mode
  if (mode === 'single') {
    const currentValue = value as SingleChoiceResponseValue | undefined

    const handleSelect = (optionId: string) => {
      if (optionId === 'other') {
        onChange({ optionId: 'other', otherText })
        // Don't auto-advance for "Other" - user needs to type
      } else {
        onChange({ optionId })
        onSelectionComplete?.()
      }
    }

    const handleOtherTextChange = (text: string) => {
      setOtherText(text)
      if (currentValue?.optionId === 'other') {
        onChange({ optionId: 'other', otherText: text })
      }
    }

    return (
      <div className="space-y-4">
        <div className={cn('grid gap-4', gridClass)}>
          {displayOptions.map((option, index) => {
            const isSelected = currentValue?.optionId === option.id

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.id)}
                className={cn(
                  'group relative rounded-lg overflow-hidden transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                  isSelected
                    ? isBranded
                      ? 'ring-2 ring-[var(--brand)] shadow-lg scale-[1.02]'
                      : 'ring-2 ring-primary shadow-lg scale-[1.02]'
                    : 'ring-1 ring-border hover:ring-2 hover:ring-muted-foreground/50 hover:shadow-md hover:scale-[1.01]',
                  isBranded
                    ? 'focus-visible:ring-[var(--brand)]'
                    : 'focus-visible:ring-ring'
                )}
              >
                {/* Keyboard hint */}
                {showKeyboardHints && (
                  <div className="absolute top-2 left-2 z-10">
                    <OptionKeyboardHint
                      hint={getKeyboardHint('image_choice', index)}
                      selected={isSelected}
                      branded={isBranded}
                    />
                  </div>
                )}

                {/* Selection checkmark overlay */}
                {isSelected && (
                  <div
                    className={cn(
                      'absolute top-2 right-2 z-10 h-6 w-6 rounded-full flex items-center justify-center',
                      isBranded
                        ? 'bg-[var(--brand)] text-white'
                        : 'bg-primary text-primary-foreground'
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </div>
                )}

                {/* Image */}
                <div className="relative aspect-square bg-muted">
                  {option.imageUrl ? (
                    <Image
                      src={option.imageUrl}
                      alt={option.label || 'Option image'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>

                {/* Label */}
                {showLabels && option.label && (
                  <div
                    className={cn(
                      'px-3 py-2 text-sm font-medium text-center truncate',
                      isSelected ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {option.label}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* "Other" option */}
        {config.allowOther && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleSelect('other')}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg border p-4 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                currentValue?.optionId === 'other'
                  ? isBranded
                    ? 'border-[var(--brand)] bg-[var(--brand)]/5 ring-1 ring-[var(--brand)]'
                    : 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-muted-foreground/50',
                isBranded
                  ? 'focus-visible:ring-[var(--brand)]'
                  : 'focus-visible:ring-ring'
              )}
            >
              {showKeyboardHints && (
                <OptionKeyboardHint
                  hint={getKeyboardHint('image_choice', displayOptions.length)}
                  selected={currentValue?.optionId === 'other'}
                  branded={isBranded}
                />
              )}
              <span className="text-base text-foreground">
                {config.otherLabel || 'Other'}
              </span>
            </button>
            {currentValue?.optionId === 'other' && (
              <Input
                placeholder="Please specify..."
                value={otherText}
                onChange={(e) => handleOtherTextChange(e.target.value)}
                className="text-base"
                autoFocus
              />
            )}
          </div>
        )}
      </div>
    )
  }

  // Multi-select mode
  const currentValue = value as MultiChoiceResponseValue | undefined
  const selectedIds = currentValue?.optionIds || []

  const canSelectMore =
    !config.maxSelections || selectedIds.length < config.maxSelections

  const handleToggle = (optionId: string) => {
    let newIds: string[]
    const isCurrentlySelected = selectedIds.includes(optionId)

    if (isCurrentlySelected) {
      // Deselect
      newIds = selectedIds.filter((id) => id !== optionId)
    } else {
      // Select (if allowed)
      if (!canSelectMore && optionId !== 'other') {
        return // Can't select more
      }
      newIds = [...selectedIds, optionId]
    }

    const includesOther = newIds.includes('other')
    onChange({
      optionIds: newIds,
      ...(includesOther && { otherText }),
    })

    // Auto-advance only if maxSelections is set and reached
    if (config.maxSelections && newIds.length >= config.maxSelections) {
      onSelectionComplete?.()
    }
  }

  const handleOtherTextChange = (text: string) => {
    setOtherText(text)
    if (selectedIds.includes('other')) {
      onChange({ optionIds: selectedIds, otherText: text })
    }
  }

  return (
    <div className="space-y-4">
      {/* Selection limits hint */}
      {(config.minSelections || config.maxSelections) && (
        <p className="text-sm text-muted-foreground">
          {config.minSelections && config.maxSelections
            ? `Select between ${config.minSelections} and ${config.maxSelections} images`
            : config.minSelections
              ? `Select at least ${config.minSelections} image${config.minSelections > 1 ? 's' : ''}`
              : `Select up to ${config.maxSelections} image${config.maxSelections! > 1 ? 's' : ''}`}
        </p>
      )}

      <div className={cn('grid gap-4', gridClass)}>
        {displayOptions.map((option, index) => {
          const isSelected = selectedIds.includes(option.id)
          const isDisabled = !isSelected && !canSelectMore

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleToggle(option.id)}
              disabled={isDisabled}
              className={cn(
                'group relative rounded-lg overflow-hidden transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                isSelected
                  ? isBranded
                    ? 'ring-2 ring-[var(--brand)] shadow-lg scale-[1.02]'
                    : 'ring-2 ring-primary shadow-lg scale-[1.02]'
                  : isDisabled
                    ? 'ring-1 ring-border opacity-50 cursor-not-allowed'
                    : 'ring-1 ring-border hover:ring-2 hover:ring-muted-foreground/50 hover:shadow-md hover:scale-[1.01]',
                isBranded
                  ? 'focus-visible:ring-[var(--brand)]'
                  : 'focus-visible:ring-ring'
              )}
            >
              {/* Keyboard hint */}
              {showKeyboardHints && (
                <div className="absolute top-2 left-2 z-10">
                  <OptionKeyboardHint
                    hint={getKeyboardHint('image_choice', index)}
                    selected={isSelected}
                    branded={isBranded}
                  />
                </div>
              )}

              {/* Selection checkmark overlay */}
              {isSelected && (
                <div
                  className={cn(
                    'absolute top-2 right-2 z-10 h-6 w-6 rounded-full flex items-center justify-center',
                    isBranded
                      ? 'bg-[var(--brand)] text-white'
                      : 'bg-primary text-primary-foreground'
                  )}
                >
                  <Check className="h-4 w-4" />
                </div>
              )}

              {/* Image */}
              <div className="relative aspect-square bg-muted">
                {option.imageUrl ? (
                  <Image
                    src={option.imageUrl}
                    alt={option.label || 'Option image'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    No image
                  </div>
                )}
              </div>

              {/* Label */}
              {showLabels && option.label && (
                <div
                  className={cn(
                    'px-3 py-2 text-sm font-medium text-center truncate',
                    isSelected ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {option.label}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* "Other" option */}
      {config.allowOther && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleToggle('other')}
            disabled={!selectedIds.includes('other') && !canSelectMore}
            className={cn(
              'w-full flex items-center gap-3 rounded-lg border p-4 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              selectedIds.includes('other')
                ? isBranded
                  ? 'border-[var(--brand)] bg-[var(--brand)]/5 ring-1 ring-[var(--brand)]'
                  : 'border-primary bg-primary/5 ring-1 ring-primary'
                : !canSelectMore
                  ? 'border-border opacity-50 cursor-not-allowed'
                  : 'border-border hover:border-muted-foreground/50',
              isBranded
                ? 'focus-visible:ring-[var(--brand)]'
                : 'focus-visible:ring-ring'
            )}
          >
            {showKeyboardHints && (
              <OptionKeyboardHint
                hint={getKeyboardHint('image_choice', displayOptions.length)}
                selected={selectedIds.includes('other')}
                branded={isBranded}
              />
            )}
            <span className="text-base text-foreground">
              {config.otherLabel || 'Other'}
            </span>
          </button>
          {selectedIds.includes('other') && (
            <Input
              placeholder="Please specify..."
              value={otherText}
              onChange={(e) => handleOtherTextChange(e.target.value)}
              className="text-base"
              autoFocus
            />
          )}
        </div>
      )}
    </div>
  )
}
