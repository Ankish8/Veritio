'use client'

import { Label } from '@veritio/ui'
import type { NPSQuestionConfig } from '../../../../../lib/supabase/study-flow-types'
import { SmartInput } from '../../../../yjs'
import { AiFollowupConfigSection } from './ai-followup-config-section'

interface NPSConfigProps {
  questionId: string
  config: NPSQuestionConfig
  onChange: (config: Partial<NPSQuestionConfig>) => void
}

export function NPSConfig({ questionId, config, onChange }: NPSConfigProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Net Promoter Score (NPS) is a standard 0-10 scale commonly used to measure customer loyalty
        and satisfaction.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nps-left-label">Left Label (0)</Label>
          <SmartInput
            id="nps-left-label"
            fieldPath={`question.${questionId}.config.leftLabel`}
            value={config.leftLabel || ''}
            onChange={(value) => onChange({ leftLabel: value || undefined })}
            placeholder="Not at all likely"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nps-right-label">Right Label (10)</Label>
          <SmartInput
            id="nps-right-label"
            fieldPath={`question.${questionId}.config.rightLabel`}
            value={config.rightLabel || ''}
            onChange={(value) => onChange({ rightLabel: value || undefined })}
            placeholder="Extremely likely"
          />
        </div>
      </div>

      <AiFollowupConfigSection
        questionId={questionId}
        config={config.aiFollowup}
        onChange={(aiFollowup) => onChange({ aiFollowup })}
      />
    </div>
  )
}
