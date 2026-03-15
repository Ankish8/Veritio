'use client'

import { Label } from '@veritio/ui'
import { SegmentedControl } from '@veritio/ui'
import type { OpinionScaleQuestionConfig, OpinionScaleType } from '../../../../../lib/supabase/study-flow-types'
import { Star, Smile } from 'lucide-react'
import { AiFollowupConfigSection } from './ai-followup-config-section'

interface OpinionScaleConfigProps {
  questionId?: string
  config: OpinionScaleQuestionConfig
  onChange: (config: Partial<OpinionScaleQuestionConfig>) => void
}

const SCALE_TYPES = [
  { value: 'stars' as OpinionScaleType, label: 'Stars', icon: Star },
  { value: 'emotions' as OpinionScaleType, label: 'Emotions', icon: Smile },
]

// Both stars and emotions are fixed at 5 points
const FIXED_SCALE_POINTS = 5

export function OpinionScaleConfig({ questionId, config, onChange }: OpinionScaleConfigProps) {
  const scaleType = config.scaleType || 'stars'

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Scale type</Label>
        <SegmentedControl
          options={SCALE_TYPES}
          value={scaleType}
          onValueChange={(value) => onChange({ scaleType: value as OpinionScaleType, scalePoints: FIXED_SCALE_POINTS })}
        />
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
