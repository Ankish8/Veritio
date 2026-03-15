'use client'

import { memo, useCallback, useMemo } from 'react'
import { Label } from '@veritio/ui/components/label'
import { Button } from '@veritio/ui/components/button'
import { Input } from '@veritio/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@veritio/ui'
import type {
  StudyFlowQuestion,
  ScaleBranchingLogic,
  ScaleBranchingRule,
  ScaleComparison,
  BranchTarget,
  OpinionScaleQuestionConfig,
} from '../../../../../lib/supabase/study-flow-types'
import { comparisonOptions } from './constants'
import { BranchTargetSelector } from './branch-target-selector'
import { DefaultTargetSection } from './default-target-section'

export interface ScaleBranchingEditorProps {
  question: StudyFlowQuestion
  logic: ScaleBranchingLogic
  onChange: (logic: ScaleBranchingLogic) => void
}

interface ScaleParams {
  startValue: number
  endValue: number
}

function getScaleParams(question: StudyFlowQuestion): ScaleParams {
  if (question.question_type === 'nps') {
    return { startValue: 0, endValue: 10 }
  }
  const opConfig = question.config as unknown as OpinionScaleQuestionConfig
  const scalePoints = opConfig.scalePoints || 5
  const startValue = opConfig.startAtZero ? 0 : 1
  return { startValue, endValue: startValue + scalePoints - 1 }
}
export const ScaleBranchingEditor = memo(function ScaleBranchingEditor({
  question,
  logic,
  onChange,
}: ScaleBranchingEditorProps) {
  const { startValue, endValue } = useMemo(() => getScaleParams(question), [question])

  const addRule = useCallback(() => {
    const defaultValue = Math.floor((startValue + endValue) / 2)
    onChange({
      ...logic,
      rules: [
        ...logic.rules,
        { comparison: 'less_than' as const, scaleValue: defaultValue, target: 'reject' as const },
      ],
    })
  }, [startValue, endValue, logic, onChange])

  const updateRule = useCallback(
    (index: number, updates: Partial<ScaleBranchingRule>) => {
      const newRules = [...logic.rules]
      newRules[index] = { ...newRules[index], ...updates }
      onChange({ ...logic, rules: newRules })
    },
    [logic, onChange]
  )

  const removeRule = useCallback(
    (index: number) => {
      onChange({
        ...logic,
        rules: logic.rules.filter((_, i) => i !== index),
      })
    },
    [logic, onChange]
  )

  const handleDefaultChange = useCallback(
    (target: BranchTarget) => {
      onChange({ ...logic, defaultTarget: target })
    },
    [logic, onChange]
  )

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Create rules based on the scale value ({startValue}-{endValue}):
        </Label>

        <div className="space-y-2">
          {logic.rules.map((rule, index) => (
            <ScaleRuleRow
              key={index}
              rule={rule}
              index={index}
              startValue={startValue}
              endValue={endValue}
              onUpdate={updateRule}
              onRemove={removeRule}
            />
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={addRule}>
          <Plus className="mr-2 h-4 w-4" />
          Add Rule
        </Button>
      </div>

      <DefaultTargetSection
        value={logic.defaultTarget}
        onChange={handleDefaultChange}
        description="When no rules match the participant's response"
      />
    </div>
  )
})

interface ScaleRuleRowProps {
  rule: ScaleBranchingRule
  index: number
  startValue: number
  endValue: number
  onUpdate: (index: number, updates: Partial<ScaleBranchingRule>) => void
  onRemove: (index: number) => void
}

const ScaleRuleRow = memo(function ScaleRuleRow({
  rule,
  index,
  startValue,
  endValue,
  onUpdate,
  onRemove,
}: ScaleRuleRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-3 rounded-lg border',
        rule.target === 'reject' && 'bg-red-50 border-red-200',
        rule.target === 'go_to_study' && 'bg-blue-50 border-blue-200',
        rule.target === 'next' && 'bg-background'
      )}
    >
      <span className="text-sm shrink-0">If value</span>

      <Select
        value={rule.comparison}
        onValueChange={(value) => onUpdate(index, { comparison: value as ScaleComparison })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {comparisonOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="number"
        min={startValue}
        max={endValue}
        value={rule.scaleValue}
        onChange={(e) => onUpdate(index, { scaleValue: parseInt(e.target.value) || startValue })}
        className="w-16"
      />

      <span className="text-sm shrink-0">then</span>

      <BranchTargetSelector
        value={rule.target}
        onChange={(value) => onUpdate(index, { target: value })}
      />

      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => onRemove(index)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
})
