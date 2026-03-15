'use client'

import { Label } from '@veritio/ui'
import { SegmentedControl } from '@veritio/ui'
import type { TextQuestionConfig, TextInputType } from '../../../../../lib/supabase/study-flow-types'
import { Type, Hash, Calendar, AtSign } from 'lucide-react'
import { SmartBlurSaveInput } from '../../../../yjs'
import { AiFollowupConfigSection } from './ai-followup-config-section'

interface TextConfigProps {
  questionId: string
  config: TextQuestionConfig
  onChange: (config: Partial<TextQuestionConfig>) => void
  isMultiLine?: boolean
}

const INPUT_TYPES = [
  { value: 'text' as TextInputType, label: 'Text', icon: Type },
  { value: 'numerical' as TextInputType, label: 'Numerical', icon: Hash },
  { value: 'date' as TextInputType, label: 'Date', icon: Calendar },
  { value: 'email' as TextInputType, label: 'Email', icon: AtSign },
]

export function TextConfig({ questionId, config, onChange, isMultiLine = false }: TextConfigProps) {
  const inputType = config.inputType || 'text'

  const placeholderHint = isMultiLine
    ? 'Enter your response...'
    : inputType === 'email'
      ? 'name@example.com'
      : inputType === 'numerical'
        ? 'Enter a number...'
        : inputType === 'date'
          ? 'Select a date'
          : 'Type your answer...'

  return (
    <div className="space-y-4">
      {/* Input Type Selector - Only for single-line text */}
      {!isMultiLine && (
        <div className="space-y-2">
          <Label>Type</Label>
          <SegmentedControl
            options={INPUT_TYPES}
            value={inputType}
            onValueChange={(value) => onChange({ inputType: value as TextInputType })}
          />
        </div>
      )}

      {/* Placeholder Text */}
      <div className="space-y-2">
        <Label htmlFor="text-placeholder">Placeholder Text</Label>
        <SmartBlurSaveInput
          id="text-placeholder"
          fieldPath={`question.${questionId}.config.placeholder`}
          value={config.placeholder || ''}
          onValueChange={(value) => onChange({ placeholder: value || undefined })}
          placeholder={placeholderHint}
        />
        <p className="text-xs text-muted-foreground">
          Hint text shown in the input field
        </p>
      </div>

      {/* Length/Value constraints - Show based on input type */}
      {inputType === 'numerical' && !isMultiLine ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="num-min">Minimum Value</Label>
            <SmartBlurSaveInput
              id="num-min"
              type="number"
              inputMode="decimal"
              fieldPath={`question.${questionId}.config.minValue`}
              value={config.minValue?.toString() || ''}
              onValueChange={(value) => {
                const parsed = parseFloat(value)
                onChange({ minValue: !isNaN(parsed) ? parsed : undefined })
              }}
              placeholder="No minimum"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="num-max">Maximum Value</Label>
            <SmartBlurSaveInput
              id="num-max"
              type="number"
              inputMode="decimal"
              fieldPath={`question.${questionId}.config.maxValue`}
              value={config.maxValue?.toString() || ''}
              onValueChange={(value) => {
                const parsed = parseFloat(value)
                onChange({ maxValue: !isNaN(parsed) ? parsed : undefined })
              }}
              placeholder="No maximum"
            />
          </div>
        </div>
      ) : inputType === 'date' && !isMultiLine ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date-min">Earliest Date</Label>
            <SmartBlurSaveInput
              id="date-min"
              type="date"
              fieldPath={`question.${questionId}.config.minDate`}
              value={config.minDate || ''}
              onValueChange={(value) => onChange({ minDate: value || undefined })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-max">Latest Date</Label>
            <SmartBlurSaveInput
              id="date-max"
              type="date"
              fieldPath={`question.${questionId}.config.maxDate`}
              value={config.maxDate || ''}
              onValueChange={(value) => onChange({ maxDate: value || undefined })}
            />
          </div>
        </div>
      ) : inputType === 'text' || isMultiLine ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="text-min">Minimum Length</Label>
            <SmartBlurSaveInput
              id="text-min"
              type="number"
              fieldPath={`question.${questionId}.config.minLength`}
              value={config.minLength?.toString() || ''}
              onValueChange={(value) => onChange({ minLength: value ? parseInt(value) : undefined })}
              placeholder="No minimum"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="text-max">Maximum Length</Label>
            <SmartBlurSaveInput
              id="text-max"
              type="number"
              fieldPath={`question.${questionId}.config.maxLength`}
              value={config.maxLength?.toString() || ''}
              onValueChange={(value) => onChange({ maxLength: value ? parseInt(value) : undefined })}
              placeholder="No maximum"
            />
          </div>
        </div>
      ) : null}

      {/* AI Follow-up Probing - Only for text-type inputs */}
      {(isMultiLine || inputType === 'text') && (
        <AiFollowupConfigSection
          questionId={questionId}
          config={config.aiFollowup}
          onChange={(aiFollowup) => onChange({ aiFollowup })}
        />
      )}
    </div>
  )
}
