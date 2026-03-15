'use client'

import { Label } from '@veritio/ui'
import { Input } from '@veritio/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui'
import type { SliderQuestionConfig, SliderStepSize } from '../../../../../lib/supabase/study-flow-types'
import { ToggleOptionRow } from '../toggle-option-row'
import { AiFollowupConfigSection } from './ai-followup-config-section'

interface SliderConfigProps {
  questionId?: string
  config: SliderQuestionConfig
  onChange: (config: Partial<SliderQuestionConfig>) => void
}

const STEP_OPTIONS: { value: SliderStepSize; label: string }[] = [
  { value: 1, label: '1 (Fine)' },
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 25, label: '25 (Coarse)' },
]

export function SliderConfig({ questionId, config, onChange }: SliderConfigProps) {
  const minValue = config.minValue ?? 0
  const maxValue = config.maxValue ?? 100
  const step = config.step ?? 1

  return (
    <div className="space-y-6">
      {/* Range settings */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Value Range</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minValue" className="text-xs text-muted-foreground">
              Minimum
            </Label>
            <Input
              id="minValue"
              type="number"
              value={minValue}
              onChange={(e) => onChange({ minValue: parseInt(e.target.value, 10) || 0 })}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxValue" className="text-xs text-muted-foreground">
              Maximum
            </Label>
            <Input
              id="maxValue"
              type="number"
              value={maxValue}
              onChange={(e) => onChange({ maxValue: parseInt(e.target.value, 10) || 100 })}
              className="h-9"
            />
          </div>
        </div>
      </div>

      {/* Step size */}
      <div className="space-y-2">
        <Label htmlFor="step">Step Increment</Label>
        <Select
          value={String(step)}
          onValueChange={(value) => onChange({ step: parseInt(value, 10) as SliderStepSize })}
        >
          <SelectTrigger id="step" className="h-9">
            <SelectValue placeholder="Select step size" />
          </SelectTrigger>
          <SelectContent>
            {STEP_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Display options */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Display Options</Label>
        <ToggleOptionRow
          id="showTicks"
          label="Show tick marks"
          description="Display markers along the slider track"
          checked={config.showTicks ?? false}
          onCheckedChange={(checked) => onChange({ showTicks: checked })}
        />
        <ToggleOptionRow
          id="showValue"
          label="Show value tooltip"
          description="Display current value while dragging"
          checked={config.showValue ?? true}
          onCheckedChange={(checked) => onChange({ showValue: checked })}
        />
      </div>

      {/* Labels */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Labels</Label>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="leftLabel" className="text-xs text-muted-foreground">
              Left (min)
            </Label>
            <Input
              id="leftLabel"
              placeholder="e.g., Not at all"
              value={config.leftLabel || ''}
              onChange={(e) => onChange({ leftLabel: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="middleLabel" className="text-xs text-muted-foreground">
              Middle (optional)
            </Label>
            <Input
              id="middleLabel"
              placeholder="e.g., Neutral"
              value={config.middleLabel || ''}
              onChange={(e) => onChange({ middleLabel: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rightLabel" className="text-xs text-muted-foreground">
              Right (max)
            </Label>
            <Input
              id="rightLabel"
              placeholder="e.g., Extremely"
              value={config.rightLabel || ''}
              onChange={(e) => onChange({ rightLabel: e.target.value })}
              className="h-9"
            />
          </div>
        </div>
      </div>

      {questionId && (
        <AiFollowupConfigSection
          questionId={questionId}
          config={config.aiFollowup}
          onChange={(aiFollowup) => onChange({ aiFollowup })}
        />
      )}
    </div>
  )
}
