'use client'

import { memo, useCallback } from 'react'
import { Label } from '@veritio/ui/components/label'
import { Switch } from '@veritio/ui/components/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@veritio/ui/components/tooltip'
import { AlertTriangle, Info } from 'lucide-react'
import type {
  StudyFlowQuestion,
  BranchingLogic,
  ScaleBranchingLogic,
} from '../../../../lib/supabase/study-flow-types'
import { ChoiceBranchingEditor } from './branching/choice-branching-editor'
import { ScaleBranchingEditor } from './branching/scale-branching-editor'

function isChoiceQuestion(type: string): boolean {
  return ['multiple_choice', 'yes_no'].includes(type)
}

function isScaleQuestion(type: string): boolean {
  return ['opinion_scale', 'nps', 'slider'].includes(type)
}

export interface BranchingLogicEditorProps {
  question: StudyFlowQuestion
  onChange: (logic: BranchingLogic | ScaleBranchingLogic | null) => void
}
export const BranchingLogicEditor = memo(function BranchingLogicEditor({
  question,
  onChange,
}: BranchingLogicEditorProps) {
  const isChoice = isChoiceQuestion(question.question_type)
  const isScale = isScaleQuestion(question.question_type)
  const supportsBranching = isChoice || isScale

  const hasLogic = !!question.branching_logic

  const toggleLogic = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        onChange({
          rules: [],
          defaultTarget: 'next',
        } as BranchingLogic | ScaleBranchingLogic)
      } else {
        onChange(null)
      }
    },
    [onChange]
  )

  if (!supportsBranching) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <h4 className="text-sm font-medium mb-2">Branching</h4>
        <p className="text-sm text-muted-foreground">
          Branching is only available for choice questions (multiple choice, yes/no) and scale
          questions (opinion scale, NPS, slider).
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="enable-branching">Branching</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm">
                    Branching logic controls participant flow based on their answers. You can reject participants, continue to the next question, or skip to specific activities based on their response.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-xs text-muted-foreground">
            Control participant flow based on answers
          </p>
        </div>
        <Switch id="enable-branching" checked={hasLogic} onCheckedChange={toggleLogic} />
      </div>

      {hasLogic && (
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center gap-2 p-2 rounded bg-amber-50 border border-amber-200 text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-xs">
              Branching rules determine if a participant passes screening. "Reject" will
              immediately end their session.
            </p>
          </div>

          {isScale ? (
            <ScaleBranchingEditor
              question={question}
              logic={question.branching_logic as unknown as ScaleBranchingLogic}
              onChange={onChange}
            />
          ) : (
            <ChoiceBranchingEditor
              question={question}
              logic={question.branching_logic as unknown as BranchingLogic}
              onChange={onChange}
            />
          )}
        </div>
      )}
    </div>
  )
})

// Keep the default export for backwards compatibility
export default BranchingLogicEditor
