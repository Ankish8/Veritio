'use client'

import { useState } from 'react'
import { Label } from '@veritio/ui'
import { Input } from '@veritio/ui'
import { Button } from '@veritio/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui'
import { Plus, Trash2, Sparkles, ArrowLeftRight } from 'lucide-react'
import { cn } from '@veritio/ui'
import { ToggleOptionRow } from '../toggle-option-row'
import type {
  SemanticDifferentialQuestionConfig,
  SemanticDifferentialScale,
  SemanticDifferentialScalePoints,
  SemanticDifferentialPresetId,
} from '../../../../../lib/supabase/study-flow-types'

interface SemanticDifferentialConfigProps {
  config: SemanticDifferentialQuestionConfig
  onChange: (config: Partial<SemanticDifferentialQuestionConfig>) => void
}

// Preset templates for common semantic differential use cases
const PRESET_TEMPLATES: Record<SemanticDifferentialPresetId, {
  label: string
  description: string
  scales: Array<{ leftLabel: string; rightLabel: string }>
}> = {
  usability: {
    label: 'Usability',
    description: 'Evaluate interface usability and user experience',
    scales: [
      { leftLabel: 'Difficult', rightLabel: 'Easy' },
      { leftLabel: 'Confusing', rightLabel: 'Clear' },
      { leftLabel: 'Inefficient', rightLabel: 'Efficient' },
      { leftLabel: 'Frustrating', rightLabel: 'Satisfying' },
      { leftLabel: 'Complex', rightLabel: 'Simple' },
    ],
  },
  aesthetics: {
    label: 'Aesthetics',
    description: 'Evaluate visual design and appearance',
    scales: [
      { leftLabel: 'Ugly', rightLabel: 'Beautiful' },
      { leftLabel: 'Dated', rightLabel: 'Modern' },
      { leftLabel: 'Unprofessional', rightLabel: 'Professional' },
      { leftLabel: 'Cluttered', rightLabel: 'Clean' },
      { leftLabel: 'Boring', rightLabel: 'Interesting' },
    ],
  },
  brand_perception: {
    label: 'Brand Perception',
    description: 'Evaluate brand attributes and perception',
    scales: [
      { leftLabel: 'Untrustworthy', rightLabel: 'Trustworthy' },
      { leftLabel: 'Traditional', rightLabel: 'Innovative' },
      { leftLabel: 'Cold', rightLabel: 'Friendly' },
      { leftLabel: 'Weak', rightLabel: 'Strong' },
      { leftLabel: 'Generic', rightLabel: 'Unique' },
    ],
  },
  product_experience: {
    label: 'Product Experience',
    description: 'Evaluate overall product experience',
    scales: [
      { leftLabel: 'Disappointing', rightLabel: 'Satisfying' },
      { leftLabel: 'Confusing', rightLabel: 'Intuitive' },
      { leftLabel: 'Limited', rightLabel: 'Powerful' },
      { leftLabel: 'Slow', rightLabel: 'Fast' },
      { leftLabel: 'Unreliable', rightLabel: 'Reliable' },
    ],
  },
  custom: {
    label: 'Custom',
    description: 'Create your own custom scales',
    scales: [],
  },
}

const SCALE_POINT_OPTIONS: SemanticDifferentialScalePoints[] = [5, 7, 9]

export function SemanticDifferentialConfig({ config, onChange }: SemanticDifferentialConfigProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const scalePoints = config.scalePoints ?? 7
  const scales = config.scales || []
  const showMiddleLabel = config.showMiddleLabel ?? true
  const middleLabel = config.middleLabel ?? 'Neutral'
  const randomizeScales = config.randomizeScales ?? false
  const showNumbers = config.showNumbers ?? false
  const presetId = config.presetId ?? 'custom'

  // Calculate centered scale values for preview
  const halfRange = Math.floor(scalePoints / 2)
  const scaleValues = Array.from({ length: scalePoints }, (_, i) => i - halfRange)

  const handleAddScale = () => {
    if (scales.length >= 10) return // Max 10 scales

    const newScale: SemanticDifferentialScale = {
      id: crypto.randomUUID(),
      leftLabel: '',
      rightLabel: '',
      weight: 1,
    }
    onChange({ scales: [...scales, newScale], presetId: 'custom' })
  }

  const handleRemoveScale = (id: string) => {
    if (scales.length <= 2) return // Min 2 scales
    onChange({ scales: scales.filter((s) => s.id !== id), presetId: 'custom' })
  }

  const handleUpdateScale = (id: string, field: keyof SemanticDifferentialScale, value: string | number) => {
    onChange({
      scales: scales.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
      presetId: 'custom',
    })
  }

  const handleApplyPreset = (preset: SemanticDifferentialPresetId) => {
    if (preset === 'custom') {
      onChange({ presetId: 'custom' })
      return
    }

    const template = PRESET_TEMPLATES[preset]
    const newScales: SemanticDifferentialScale[] = template.scales.map((scale) => ({
      id: crypto.randomUUID(),
      leftLabel: scale.leftLabel,
      rightLabel: scale.rightLabel,
      weight: 1,
    }))

    onChange({
      scales: newScales,
      presetId: preset,
    })
  }

  return (
    <div className="space-y-6">
      {/* Scale Points Selection */}
      <div className="space-y-2">
        <Label htmlFor="scalePoints">Scale Points</Label>
        <Select
          value={String(scalePoints)}
          onValueChange={(value) => onChange({ scalePoints: parseInt(value, 10) as SemanticDifferentialScalePoints })}
        >
          <SelectTrigger id="scalePoints" className="h-9">
            <SelectValue placeholder="Select scale points" />
          </SelectTrigger>
          <SelectContent>
            {SCALE_POINT_OPTIONS.map((points) => {
              const half = Math.floor(points / 2)
              return (
                <SelectItem key={points} value={String(points)}>
                  {points} points (-{half} to +{half})
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {scalePoints}-point scale ranges from -{halfRange} to +{halfRange} with 0 as neutral
        </p>
      </div>

      {/* Preset Templates */}
      <div className="space-y-2">
        <Label>Preset Template</Label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PRESET_TEMPLATES) as SemanticDifferentialPresetId[]).map((key) => {
            const template = PRESET_TEMPLATES[key]
            const isSelected = presetId === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleApplyPreset(key)}
                className={cn(
                  'flex flex-col items-start p-3 rounded-lg border text-left transition-all',
                  'hover:border-primary/50 hover:bg-muted/50',
                  isSelected && 'border-primary bg-primary/5'
                )}
              >
                <div className="flex items-center gap-2">
                  {key === 'custom' ? (
                    <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-primary" />
                  )}
                  <span className="font-medium text-sm">{template.label}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  {template.description}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Scales Editor - Grid View */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Bipolar Scales ({scales.length}/10)</Label>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 text-sm">
                <th className="text-left p-2 font-medium w-[35%]">Left Label</th>
                <th className="text-center p-2 font-medium w-[20%]">
                  <span className="text-xs text-muted-foreground">← Scale →</span>
                </th>
                <th className="text-left p-2 font-medium w-[35%]">Right Label</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {scales.map((scale) => (
                <tr key={scale.id} className="border-t">
                  <td className="p-2">
                    <Input
                      value={scale.leftLabel}
                      onChange={(e) => handleUpdateScale(scale.id, 'leftLabel', e.target.value)}
                      placeholder="e.g., Difficult"
                      className="h-8 text-sm"
                    />
                  </td>
                  <td className="p-2">
                    <div className="flex items-center justify-center gap-0.5">
                      {scaleValues.map((val) => (
                        <div
                          key={val}
                          className={cn(
                            'w-4 h-4 rounded-full border-2',
                            val === 0
                              ? 'border-primary bg-primary/10'
                              : 'border-muted-foreground/30'
                          )}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="p-2">
                    <Input
                      value={scale.rightLabel}
                      onChange={(e) => handleUpdateScale(scale.id, 'rightLabel', e.target.value)}
                      placeholder="e.g., Easy"
                      className="h-8 text-sm"
                    />
                  </td>
                  <td className="p-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRemoveScale(scale.id)}
                      disabled={scales.length <= 2}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleAddScale}
          disabled={scales.length >= 10}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Scale
        </Button>
      </div>

      {/* Display Options */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Display Options</Label>

        <ToggleOptionRow
          id="showMiddleLabel"
          label="Show middle label"
          description={'Display a label at the center point (e.g., "Neutral")'}
          checked={showMiddleLabel}
          onCheckedChange={(checked) => onChange({ showMiddleLabel: checked })}
        />

        {showMiddleLabel && (
          <div className="ml-4 pl-4 border-l">
            <Label htmlFor="middleLabel" className="text-xs text-muted-foreground">
              Middle label text
            </Label>
            <Input
              id="middleLabel"
              value={middleLabel}
              onChange={(e) => onChange({ middleLabel: e.target.value })}
              placeholder="Neutral"
              className="h-8 mt-1"
            />
          </div>
        )}

        <ToggleOptionRow
          id="showNumbers"
          label="Show numeric values"
          description={`Display values (-${halfRange} to +${halfRange}) on the scale`}
          checked={showNumbers}
          onCheckedChange={(checked) => onChange({ showNumbers: checked })}
        />

        <ToggleOptionRow
          id="randomizeScales"
          label="Randomize scale order"
          description="Present scales in random order to each participant"
          checked={randomizeScales}
          onCheckedChange={(checked) => onChange({ randomizeScales: checked })}
        />
      </div>

      {/* Advanced Options (Weights) */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? '▼' : '▶'} Advanced: Scale Weights
        </button>

        {showAdvanced && (
          <div className="space-y-2 pl-4 border-l">
            <p className="text-xs text-muted-foreground">
              Assign weights to scales for scoring calculations (default: 1)
            </p>
            {scales.map((scale, scaleIndex) => (
              <div key={scale.id} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-32 truncate">
                  {scale.leftLabel || scale.rightLabel || `Scale ${scaleIndex + 1}`}
                </span>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={scale.weight ?? 1}
                  onChange={(e) => handleUpdateScale(scale.id, 'weight', parseFloat(e.target.value) || 1)}
                  className="h-8 w-20"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
