'use client'

import { Label } from '@veritio/ui/components/label'
import { Checkbox } from '@veritio/ui/components/checkbox'
import { SegmentedControl } from '@veritio/ui/components/segmented-control'
import { Switch } from '@veritio/ui/components/switch'
import { Sparkles } from 'lucide-react'
import { SmartBlurSaveInput } from '../../../../yjs'
import type { AiFollowupConfig } from '../../../../../lib/supabase/study-flow-types'

interface AiFollowupConfigSectionProps {
  questionId: string
  config: AiFollowupConfig | undefined
  onChange: (aiFollowup: AiFollowupConfig) => void
  showTriggerConditions?: boolean
  options?: { id: string; label: string }[]
}

const TRIGGER_OPTIONS = [
  { value: 'always', label: 'Always' },
  { value: 'when_other', label: "When 'Other'" },
  { value: 'specific_options', label: 'Specific options' },
]

export function AiFollowupConfigSection({
  questionId,
  config,
  onChange,
  showTriggerConditions = false,
  options = [],
}: AiFollowupConfigSectionProps) {
  const triggerCondition = config?.triggerCondition ?? 'always'

  return (
    <div className="space-y-3 pt-3 border-t">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <Label>AI Follow-up Probing</Label>
        </div>
        <Switch
          checked={config?.enabled ?? false}
          onCheckedChange={(checked) =>
            onChange({
              ...config,
              enabled: checked,
              maxFollowups: config?.maxFollowups ?? 2,
            })
          }
        />
      </div>
      <p className="text-xs text-muted-foreground">
        AI will ask 1-2 clarifying follow-up questions when participant answers are vague or brief
      </p>

      {config?.enabled && (
        <div className="space-y-3 pl-6">
          <div className="space-y-2">
            <Label>Max Follow-ups</Label>
            <SegmentedControl
              options={[
                { value: '1', label: '1' },
                { value: '2', label: '2' },
              ]}
              value={String(config.maxFollowups ?? 2)}
              onValueChange={(v) =>
                onChange({ ...config, enabled: true, maxFollowups: Number(v) as 1 | 2 })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`depth-hint-${questionId}`}>Probing Guidance (optional)</Label>
            <SmartBlurSaveInput
              id={`depth-hint-${questionId}`}
              fieldPath={`question.${questionId}.config.aiFollowup.depthHint`}
              value={config.depthHint || ''}
              onValueChange={(value) =>
                onChange({ ...config, enabled: true, depthHint: value || undefined })
              }
              placeholder="e.g. Ask about specific pain points"
            />
            <p className="text-xs text-muted-foreground">
              Guide the AI on what to probe deeper on
            </p>
          </div>

          {showTriggerConditions && (
            <div className="space-y-2">
              <Label>Trigger Condition</Label>
              <SegmentedControl
                options={TRIGGER_OPTIONS}
                value={triggerCondition}
                onValueChange={(v) =>
                  onChange({
                    ...config,
                    enabled: true,
                    triggerCondition: v as AiFollowupConfig['triggerCondition'],
                    triggerOptionIds: v === 'specific_options' ? (config.triggerOptionIds ?? []) : undefined,
                  })
                }
              />
              {triggerCondition === 'specific_options' && options.length > 0 && (
                <div className="space-y-1 pt-1">
                  {options.map((option) => {
                    const selected = config.triggerOptionIds?.includes(option.id) ?? false
                    return (
                      <label key={option.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) => {
                            const current = config.triggerOptionIds ?? []
                            const next = checked
                              ? [...current, option.id]
                              : current.filter((id) => id !== option.id)
                            onChange({ ...config, enabled: true, triggerOptionIds: next })
                          }}
                        />
                        {option.label}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
