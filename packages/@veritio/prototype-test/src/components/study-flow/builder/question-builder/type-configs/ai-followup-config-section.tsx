'use client'

import { Label } from '@veritio/ui/components/label'
import { Checkbox } from '@veritio/ui/components/checkbox'
import { SegmentedControl } from '@veritio/ui/components/segmented-control'
import { Switch } from '@veritio/ui/components/switch'
import { Sparkles } from 'lucide-react'
import { SmartBlurSaveInput } from '../../../../yjs'
import type { AiFollowupConfig, AiFollowupFormat } from '../../../../../lib/supabase/study-flow-types'

interface AiFollowupConfigSectionProps {
  questionId: string
  config: AiFollowupConfig | undefined
  onChange: (aiFollowup: AiFollowupConfig) => void
  showTriggerConditions?: boolean
  options?: { id: string; label: string }[]
  /** NPS, opinion scale and slider: low ratings are always probed. */
  isRating?: boolean
}

const FORMAT_OPTIONS = [
  { value: 'open', label: 'Open text' },
  { value: 'adaptive', label: 'Adaptive' },
]

const FORMAT_HELP: Record<AiFollowupFormat, string> = {
  open: 'Every follow-up is an open question. Best for learning why.',
  adaptive:
    'AI may ask multiple choice or a scale when the likely answers are predictable. Quicker to answer, but options differ between participants.',
}

const TRIGGER_HELP: Record<NonNullable<AiFollowupConfig['triggerCondition']>, string> = {
  always: 'AI decides whether each answer needs a follow-up.',
  when_other: "Anyone who picks 'Other' gets a follow-up about what they wrote.",
  specific_options: 'Anyone who picks a checked option gets a follow-up.',
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
  isRating = false,
}: AiFollowupConfigSectionProps) {
  const triggerCondition = config?.triggerCondition ?? 'always'
  const format: AiFollowupFormat = config?.followupFormat ?? 'open'
  const maxFollowups = config?.maxFollowups ?? 2

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
        AI reads each answer and asks up to {maxFollowups} short follow-up{' '}
        {maxFollowups === 1 ? 'question' : 'questions'} when more detail would help. Clear, complete
        answers are not probed.
        {isRating && ' Low ratings always get a follow-up; high ratings only when you set a probing focus.'}
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
            <Label>Follow-up format</Label>
            <SegmentedControl
              options={FORMAT_OPTIONS}
              value={format}
              onValueChange={(v) =>
                onChange({ ...config, enabled: true, followupFormat: v as AiFollowupFormat })
              }
            />
            <p className="text-xs text-muted-foreground">{FORMAT_HELP[format]}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`depth-hint-${questionId}`}>Probing focus (optional)</Label>
            <SmartBlurSaveInput
              id={`depth-hint-${questionId}`}
              fieldPath={`question.${questionId}.config.aiFollowup.depthHint`}
              value={config.depthHint || ''}
              onValueChange={(value) =>
                onChange({ ...config, enabled: true, depthHint: value || undefined })
              }
              placeholder="e.g. Which step of checkout felt slow, and why"
            />
            <p className="text-xs text-muted-foreground">
              What you want to learn. The AI also uses your study&apos;s title and purpose.
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
              <p className="text-xs text-muted-foreground">{TRIGGER_HELP[triggerCondition]}</p>
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
