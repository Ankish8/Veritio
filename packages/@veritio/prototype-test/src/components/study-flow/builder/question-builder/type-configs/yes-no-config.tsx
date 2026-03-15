'use client'

import { Label } from '@veritio/ui'
import { Input } from '@veritio/ui'
import { SegmentedControl } from '@veritio/ui'
import type { YesNoQuestionConfig, YesNoStyleType } from '../../../../../lib/supabase/study-flow-types'
import { CheckCircle, Smile } from 'lucide-react'
import { AiFollowupConfigSection } from './ai-followup-config-section'

interface YesNoConfigProps {
  questionId?: string
  config: YesNoQuestionConfig
  onChange: (config: Partial<YesNoQuestionConfig>) => void
}

const STYLE_TYPES = [
  { value: 'icons' as YesNoStyleType, label: 'Icons', icon: CheckCircle },
  { value: 'emotions' as YesNoStyleType, label: 'Emotions', icon: Smile },
]

export function YesNoConfig({ questionId, config, onChange }: YesNoConfigProps) {
  const styleType = config.styleType || 'icons'

  return (
    <div className="space-y-5">
      {/* Style Type Selector */}
      <div className="space-y-2">
        <Label>Type</Label>
        <SegmentedControl
          options={STYLE_TYPES}
          value={styleType}
          onValueChange={(value) => onChange({ styleType: value as YesNoStyleType })}
        />
      </div>

      {/* Custom Labels */}
      <div className="space-y-3">
        <Label>Custom Labels (optional)</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="yes-label" className="text-xs text-muted-foreground">
              Yes label
            </Label>
            <Input
              id="yes-label"
              value={config.yesLabel || ''}
              onChange={(e) => onChange({ yesLabel: e.target.value || undefined })}
              placeholder="Yes"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="no-label" className="text-xs text-muted-foreground">
              No label
            </Label>
            <Input
              id="no-label"
              value={config.noLabel || ''}
              onChange={(e) => onChange({ noLabel: e.target.value || undefined })}
              placeholder="No"
              className="h-9"
            />
          </div>
        </div>
      </div>

      {questionId && (
        <AiFollowupConfigSection
          questionId={questionId}
          config={(config as any).aiFollowup}
          onChange={(aiFollowup) => onChange({ aiFollowup } as any)}
        />
      )}
    </div>
  )
}
