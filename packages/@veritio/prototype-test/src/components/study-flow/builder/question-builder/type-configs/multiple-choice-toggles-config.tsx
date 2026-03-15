'use client'

import { Switch } from '@veritio/ui'
import { Label } from '@veritio/ui'
import { Shuffle, MessageSquarePlus, Calculator } from 'lucide-react'
import type { MultipleChoiceQuestionConfig, ChoiceOption } from '../../../../../lib/supabase/study-flow-types'

interface MultipleChoiceTogglesConfigProps {
  config: MultipleChoiceQuestionConfig
  options: ChoiceOption[]
  hasBranchingLogic: boolean
  onConfigChange: (updates: Partial<MultipleChoiceQuestionConfig>) => void
  onBranchingToggle: (enabled: boolean) => void
  onScoringToggle: (enabled: boolean) => void
}
export function MultipleChoiceTogglesConfig({
  config,
  options,
  hasBranchingLogic,
  onConfigChange,
  onBranchingToggle,
  onScoringToggle,
}: MultipleChoiceTogglesConfigProps) {
  const hasScoring = options.some((opt) => opt.score !== undefined)

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="flex items-center gap-2">
        <Switch
          id="shuffle-toggle"
          checked={config.shuffle || false}
          onCheckedChange={(checked) => onConfigChange({ shuffle: checked })}
        />
        <Label htmlFor="shuffle-toggle" className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
          <Shuffle className="h-4 w-4 text-muted-foreground" />
          Shuffle options
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="allow-other-toggle"
          checked={config.allowOther || false}
          onCheckedChange={(checked) => onConfigChange({ allowOther: checked })}
        />
        <Label htmlFor="allow-other-toggle" className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
          <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
          &apos;Other&apos; option
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="branching-toggle"
          checked={hasBranchingLogic}
          onCheckedChange={onBranchingToggle}
        />
        <Label htmlFor="branching-toggle" className="text-sm font-normal cursor-pointer">
          Branching
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="scoring-toggle"
          checked={hasScoring}
          onCheckedChange={onScoringToggle}
        />
        <Label htmlFor="scoring-toggle" className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
          <Calculator className="h-4 w-4 text-muted-foreground" />
          Scoring
        </Label>
      </div>
    </div>
  )
}
