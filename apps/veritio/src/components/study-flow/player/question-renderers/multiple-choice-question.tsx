'use client'

import { useState, useMemo } from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OptionKeyboardHint } from '../option-keyboard-hint'
import { getKeyboardHint } from '@/lib/study-flow/keyboard-handlers'
import { useBrandingContext } from '../branding-provider'
import type {
  MultipleChoiceQuestionConfig,
  SingleChoiceResponseValue,
  MultiChoiceResponseValue,
  ResponseValue,
} from '@veritio/study-types/study-flow-types'

type MultipleChoiceValue = SingleChoiceResponseValue | MultiChoiceResponseValue

interface MultipleChoiceQuestionProps {
  config: MultipleChoiceQuestionConfig
  value: ResponseValue | undefined
  onChange: (value: MultipleChoiceValue) => void
  showKeyboardHints?: boolean
  onSelectionComplete?: () => void
}

export function MultipleChoiceQuestion({
  config,
  value,
  onChange,
  showKeyboardHints = false,
  onSelectionComplete,
}: MultipleChoiceQuestionProps) {
  const [otherText, setOtherText] = useState('')
  const { isActive: isBranded } = useBrandingContext()
  const mode = config.mode || 'single'

  // Shuffle options if configured (memoized to prevent re-shuffle on re-render)
  const displayOptions = useMemo(() => {
    const opts = config.options || []
    if (config.shuffle) {
      return [...opts].sort(() => Math.random() - 0.5) // eslint-disable-line react-hooks/purity
    }
    return opts
  }, [config.options, config.shuffle])

  // Dropdown mode - uses native Select component
  if (mode === 'dropdown') {
    const currentValue = value as SingleChoiceResponseValue | undefined

    const handleChange = (optionId: string) => {
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
      <div className="space-y-3">
        <Select
          value={currentValue?.optionId || ''}
          onValueChange={handleChange}
        >
          <SelectTrigger className="w-full text-base py-3">
            <SelectValue placeholder={config.placeholder || 'Select an option...'} />
          </SelectTrigger>
          <SelectContent>
            {displayOptions.map((option, index) => (
              <SelectItem key={option.id} value={option.id} className="text-base py-2">
                {showKeyboardHints && (
                  <span className="mr-2 text-xs text-muted-foreground font-mono">
                    {getKeyboardHint('multiple_choice', index)}
                  </span>
                )}
                {option.label}
              </SelectItem>
            ))}
            {config.allowOther && (
              <SelectItem value="other" className="text-base py-2">
                {showKeyboardHints && (
                  <span className="mr-2 text-xs text-muted-foreground font-mono">
                    {getKeyboardHint('multiple_choice', displayOptions.length)}
                  </span>
                )}
                {config.otherLabel || 'Other'}
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        {/* "Other" text input shown below dropdown when selected */}
        {config.allowOther && currentValue?.optionId === 'other' && (
          <Input
            placeholder="Please specify..."
            value={otherText}
            onChange={(e) => handleOtherTextChange(e.target.value)}
            className="text-base"
            autoFocus
          />
        )}
      </div>
    )
  }

  // Single-select mode
  if (mode === 'single') {
    const currentValue = value as SingleChoiceResponseValue | undefined

    const handleChange = (optionId: string) => {
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
      <RadioGroup
        value={currentValue?.optionId || ''}
        onValueChange={handleChange}
        className="space-y-3"
      >
        {displayOptions.map((option, index) => (
          <div key={option.id} className="flex items-center space-x-3">
            {showKeyboardHints && (
              <OptionKeyboardHint
                hint={getKeyboardHint('multiple_choice', index)}
                selected={currentValue?.optionId === option.id}
                branded={isBranded}
              />
            )}
            <RadioGroupItem value={option.id} id={option.id} className="h-5 w-5" branded={isBranded} />
            <Label htmlFor={option.id} className="cursor-pointer text-base text-foreground">
              {option.label}
            </Label>
          </div>
        ))}
        {config.allowOther && (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              {showKeyboardHints && (
                <OptionKeyboardHint
                  hint={getKeyboardHint('multiple_choice', displayOptions.length)}
                  selected={currentValue?.optionId === 'other'}
                  branded={isBranded}
                />
              )}
              <RadioGroupItem value="other" id="other" className="h-5 w-5" branded={isBranded} />
              <Label htmlFor="other" className="cursor-pointer text-base text-foreground">
                {config.otherLabel || 'Other'}
              </Label>
            </div>
            {currentValue?.optionId === 'other' && (
              <Input
                placeholder="Please specify..."
                value={otherText}
                onChange={(e) => handleOtherTextChange(e.target.value)}
                className="ml-8 text-base"
                autoFocus
              />
            )}
          </div>
        )}
      </RadioGroup>
    )
  }

  // Multi-select mode
  const currentValue = value as MultiChoiceResponseValue | undefined
  const selectedIds = currentValue?.optionIds || []

  const canSelectMore =
    !config.maxSelections || selectedIds.length < config.maxSelections

  const handleCheckboxChange = (optionId: string, checked: boolean) => {
    let newIds: string[]

    if (checked) {
      if (!canSelectMore && optionId !== 'other') {
        return // Can't select more
      }
      newIds = [...selectedIds, optionId]
    } else {
      newIds = selectedIds.filter((id) => id !== optionId)
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
    <div className="space-y-3">
      {/* Selection limits hint */}
      {(config.minSelections || config.maxSelections) && (
        <p className="text-sm text-muted-foreground mb-2">
          {config.minSelections && config.maxSelections
            ? `Select between ${config.minSelections} and ${config.maxSelections} options`
            : config.minSelections
              ? `Select at least ${config.minSelections} option${config.minSelections > 1 ? 's' : ''}`
              : `Select up to ${config.maxSelections} option${config.maxSelections! > 1 ? 's' : ''}`}
        </p>
      )}

      {displayOptions.map((option, index) => (
        <div key={option.id} className="flex items-center space-x-3">
          {showKeyboardHints && (
            <OptionKeyboardHint
              hint={getKeyboardHint('multiple_choice', index)}
              selected={selectedIds.includes(option.id)}
              branded={isBranded}
            />
          )}
          <Checkbox
            id={option.id}
            checked={selectedIds.includes(option.id)}
            onCheckedChange={(checked) =>
              handleCheckboxChange(option.id, checked === true)
            }
            disabled={!selectedIds.includes(option.id) && !canSelectMore}
            className="h-5 w-5"
            branded={isBranded}
          />
          <Label htmlFor={option.id} className="cursor-pointer text-base text-foreground">
            {option.label}
          </Label>
        </div>
      ))}

      {config.allowOther && (
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            {showKeyboardHints && (
              <OptionKeyboardHint
                hint={getKeyboardHint('multiple_choice', displayOptions.length)}
                selected={selectedIds.includes('other')}
                branded={isBranded}
              />
            )}
            <Checkbox
              id="other"
              checked={selectedIds.includes('other')}
              onCheckedChange={(checked) =>
                handleCheckboxChange('other', checked === true)
              }
              className="h-5 w-5"
              branded={isBranded}
            />
            <Label htmlFor="other" className="cursor-pointer text-base text-foreground">
              {config.otherLabel || 'Other'}
            </Label>
          </div>
          {selectedIds.includes('other') && (
            <Input
              placeholder="Please specify..."
              value={otherText}
              onChange={(e) => handleOtherTextChange(e.target.value)}
              className="ml-8 text-base"
              autoFocus
            />
          )}
        </div>
      )}
    </div>
  )
}
