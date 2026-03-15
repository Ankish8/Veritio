'use client'

import { useMemo } from 'react'
import { Label } from '@veritio/ui/components/label'
import { Switch } from '@veritio/ui/components/switch'
import { Button } from '@veritio/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import { Plus } from 'lucide-react'
import type {
  StudyFlowQuestion,
  DisplayLogic,
  DisplayLogicCondition,
  DisplayLogicOperator,
  DisplayLogicAction,
} from '../../../../lib/supabase/study-flow-types'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import {
  getOperatorsForQuestion,
  getDefaultOperator,
} from '@veritio/prototype-test/lib/study-flow/display-logic-operators'
import { ConditionRow } from './condition-row'

interface DisplayLogicEditorProps {
  question: StudyFlowQuestion
  onChange: (logic: DisplayLogic | null) => void
}

export function DisplayLogicEditor({ question, onChange }: DisplayLogicEditorProps) {
  const { screeningQuestions, preStudyQuestions, postStudyQuestions, surveyQuestions } = useStudyFlowBuilderStore()

  // Get all questions that come before this one in the same section
  const previousQuestions = useMemo((): StudyFlowQuestion[] => {
    let sectionQuestions: StudyFlowQuestion[] = []

    switch (question.section) {
      case 'screening':
        sectionQuestions = screeningQuestions
        break
      case 'pre_study':
        sectionQuestions = preStudyQuestions
        break
      case 'post_study':
        sectionQuestions = postStudyQuestions
        break
      case 'survey':
        sectionQuestions = surveyQuestions
        break
    }

    return sectionQuestions.filter(
      (q) => q.position < question.position && q.id !== question.id
    )
  }, [question.section, question.position, question.id, screeningQuestions, preStudyQuestions, postStudyQuestions, surveyQuestions])

  const hasLogic = !!question.display_logic
  const logic = question.display_logic || {
    action: 'show' as DisplayLogicAction,
    conditions: [],
    matchAll: true,
  }

  const toggleLogic = (enabled: boolean) => {
    if (enabled) {
      onChange({
        action: 'show',
        conditions: [],
        matchAll: true,
      })
    } else {
      onChange(null)
    }
  }

  const updateLogic = (updates: Partial<DisplayLogic>) => {
    onChange({ ...logic, ...updates })
  }

  const addCondition = () => {
    if (previousQuestions.length === 0) return

    const firstQuestion = previousQuestions[0]
    const defaultOp = getDefaultOperator(firstQuestion)

    const newCondition: DisplayLogicCondition = {
      questionId: firstQuestion.id,
      operator: defaultOp as DisplayLogicOperator,
    }

    updateLogic({
      conditions: [...logic.conditions, newCondition],
    })
  }

  const updateCondition = (index: number, updates: Partial<DisplayLogicCondition>) => {
    const newConditions = [...logic.conditions]
    newConditions[index] = { ...newConditions[index], ...updates }
    updateLogic({ conditions: newConditions })
  }

  const removeCondition = (index: number) => {
    updateLogic({
      conditions: logic.conditions.filter((_, i) => i !== index),
    })
  }

  // Handle question change - reset operator and values
  const handleQuestionChange = (index: number, questionId: string) => {
    const newQuestion = previousQuestions.find((q) => q.id === questionId)
    if (!newQuestion) return

    const defaultOp = getDefaultOperator(newQuestion)
    updateCondition(index, {
      questionId,
      operator: defaultOp as DisplayLogicOperator,
      // Reset all value fields
      value: undefined,
      values: undefined,
      minValue: undefined,
      maxValue: undefined,
      rowId: undefined,
      columnId: undefined,
      columnIds: undefined,
      itemId: undefined,
      secondItemId: undefined,
      position: undefined,
      scaleId: undefined,
    })
  }

  // Handle operator change - reset values if UI type changes
  const handleOperatorChange = (index: number, operator: DisplayLogicOperator, sourceQuestion: StudyFlowQuestion) => {
    const operators = getOperatorsForQuestion(sourceQuestion)
    const oldOp = operators.find(o => o.value === logic.conditions[index].operator)
    const newOp = operators.find(o => o.value === operator)

    // If value UI type changed, reset values
    if (oldOp?.valueUI !== newOp?.valueUI) {
      updateCondition(index, {
        operator,
        value: undefined,
        values: undefined,
        minValue: undefined,
        maxValue: undefined,
        rowId: undefined,
        columnId: undefined,
        columnIds: undefined,
        itemId: undefined,
        secondItemId: undefined,
        position: undefined,
        scaleId: undefined,
      })
    } else {
      updateCondition(index, { operator })
    }
  }

  if (previousQuestions.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <h4 className="text-sm font-medium mb-2">Display Logic</h4>
        <p className="text-sm text-muted-foreground">
          Display logic allows you to show or hide this question based on previous answers.
          Add questions before this one to enable display logic.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="enable-logic">Enable Display Logic</Label>
          <p className="text-xs text-muted-foreground">
            Show or hide this question based on previous answers
          </p>
        </div>
        <Switch
          id="enable-logic"
          checked={hasLogic}
          onCheckedChange={toggleLogic}
        />
      </div>

      {hasLogic && (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Select
              value={logic.action}
              onValueChange={(value) => updateLogic({ action: value as DisplayLogicAction })}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="show">Show</SelectItem>
                <SelectItem value="hide">Hide</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm">this question if</span>
            <Select
              value={logic.matchAll ? 'all' : 'any'}
              onValueChange={(value) => updateLogic({ matchAll: value === 'all' })}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all</SelectItem>
                <SelectItem value="any">any</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm">conditions are met:</span>
          </div>

          <div className="space-y-2">
            {logic.conditions.map((condition, index) => {
              const sourceQuestion = previousQuestions.find(q => q.id === condition.questionId)

              return (
                <ConditionRow
                  key={index}
                  condition={condition}
                  sourceQuestion={sourceQuestion}
                  previousQuestions={previousQuestions}
                  onQuestionChange={(questionId) => handleQuestionChange(index, questionId)}
                  onOperatorChange={(operator) => handleOperatorChange(index, operator, sourceQuestion!)}
                  onUpdate={(updates) => updateCondition(index, updates)}
                  onRemove={() => removeCondition(index)}
                />
              )
            })}
          </div>

          <Button variant="outline" size="sm" onClick={addCondition}>
            <Plus className="mr-2 h-4 w-4" />
            Add Condition
          </Button>
        </div>
      )}
    </div>
  )
}
