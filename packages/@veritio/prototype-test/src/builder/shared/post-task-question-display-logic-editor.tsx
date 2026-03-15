'use client'

import { Label } from '@veritio/ui/components/label'
import { Switch } from '@veritio/ui/components/switch'
import { Button } from '@veritio/ui/components/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import { Input } from '@veritio/ui/components/input'
import { Plus, Trash2 } from 'lucide-react'
import { ConditionTemplates } from './condition-templates'
import type {
  DisplayLogic,
  DisplayLogicCondition,
  DisplayLogicOperator,
  DisplayLogicAction,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'
import {
  TASK_RESULT_QUESTION_ID,
  TASK_DIRECT_SUCCESS_QUESTION_ID,
  getTaskMetricQuestionId,
  parseTaskMetricQuestionId,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { PostTaskQuestion } from '@veritio/study-types'

interface PostTaskQuestionDisplayLogicEditorProps {
  question: PostTaskQuestion
  previousQuestions: PostTaskQuestion[]
  onChange: (logic: DisplayLogic | null) => void
}

// Type for condition source options
interface ConditionSourceOption {
  id: string
  label: string
  type: 'task-result' | 'success-type' | 'number' | 'time'
  description: string
}

// Condition source definitions - grouped by category
const CONDITION_SOURCES = [
  {
    category: 'Task Outcome',
    options: [
      {
        id: TASK_RESULT_QUESTION_ID,
        label: 'Task result',
        type: 'task-result' as const,
        description: 'Success, failure, or skipped',
      },
      {
        id: TASK_DIRECT_SUCCESS_QUESTION_ID,
        label: 'Success type',
        type: 'success-type' as const,
        description: 'Direct (optimal path) or indirect',
      },
    ],
  },
  {
    category: 'Performance Metrics',
    options: [
      {
        id: getTaskMetricQuestionId('misclickCount'),
        label: 'Misclick count',
        type: 'number' as const,
        description: 'Clicks that didn\'t trigger actions',
      },
      {
        id: getTaskMetricQuestionId('clickCount'),
        label: 'Total clicks',
        type: 'number' as const,
        description: 'All clicks during the task',
      },
      {
        id: getTaskMetricQuestionId('backtrackCount'),
        label: 'Backtrack count',
        type: 'number' as const,
        description: 'Times user went back',
      },
    ],
  },
  {
    category: 'Time Metrics',
    options: [
      {
        id: getTaskMetricQuestionId('totalTimeMs'),
        label: 'Total time',
        type: 'time' as const,
        description: 'Time spent on task',
      },
      {
        id: getTaskMetricQuestionId('timeToFirstClickMs'),
        label: 'Time to first click',
        type: 'time' as const,
        description: 'Hesitation before first action',
      },
    ],
  },
  {
    category: 'Path Metrics',
    options: [
      {
        id: getTaskMetricQuestionId('pathLength'),
        label: 'Screens visited',
        type: 'number' as const,
        description: 'Number of frames navigated',
      },
    ],
  },
]

// Flatten sources for lookup
const ALL_SOURCES: ConditionSourceOption[] = CONDITION_SOURCES.flatMap((g) => g.options as ConditionSourceOption[])

// Operators for different condition types
const TASK_RESULT_OPERATORS: { value: DisplayLogicOperator; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
]

const NUMERIC_OPERATORS: { value: DisplayLogicOperator; label: string }[] = [
  { value: 'greater_than', label: 'is greater than' },
  { value: 'less_than', label: 'is less than' },
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
]

const QUESTION_OPERATORS: { value: DisplayLogicOperator; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'is_answered', label: 'is answered' },
  { value: 'is_not_answered', label: 'is not answered' },
]

// Task result dropdown options
const TASK_RESULT_OPTIONS = [
  { value: 'success', label: 'Success' },
  { value: 'failure', label: 'Failed / Gave up' },
  { value: 'skipped', label: 'Skipped' },
]

// Success type dropdown options
const SUCCESS_TYPE_OPTIONS = [
  { value: 'direct', label: 'Direct (optimal path)' },
  { value: 'indirect', label: 'Indirect (suboptimal path)' },
]
function getSourceType(questionId: string): 'task-result' | 'success-type' | 'number' | 'time' | 'question' {
  const source = ALL_SOURCES.find((s) => s.id === questionId)
  if (source) return source.type

  // Check if it's a task metric
  const metric = parseTaskMetricQuestionId(questionId)
  if (metric) {
    return ['totalTimeMs', 'timeToFirstClickMs'].includes(metric) ? 'time' : 'number'
  }

  // Default to question type (for previous questions)
  return 'question'
}
function getOperatorsForSource(sourceType: ReturnType<typeof getSourceType>) {
  switch (sourceType) {
    case 'task-result':
    case 'success-type':
      return TASK_RESULT_OPERATORS
    case 'number':
    case 'time':
      return NUMERIC_OPERATORS
    case 'question':
    default:
      return QUESTION_OPERATORS
  }
}
function TimeInput({
  valueMs,
  onChange,
}: {
  valueMs: string | undefined
  onChange: (valueMs: string) => void
}) {
  // Convert ms to seconds for display (default to seconds)
  const ms = parseInt(valueMs || '0', 10)
  const displayValue = ms > 0 ? (ms / 1000).toString() : ''

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seconds = parseFloat(e.target.value)
    if (!isNaN(seconds)) {
      onChange((seconds * 1000).toString())
    } else if (e.target.value === '') {
      onChange('')
    }
  }

  return (
    <div className="flex items-center gap-2 flex-1">
      <Input
        type="number"
        min="0"
        step="0.1"
        placeholder="0"
        value={displayValue}
        onChange={handleChange}
        className="w-20"
      />
      <span className="text-sm text-muted-foreground">seconds</span>
    </div>
  )
}

export function PostTaskQuestionDisplayLogicEditor({
  question,
  previousQuestions,
  onChange,
}: PostTaskQuestionDisplayLogicEditorProps) {
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
    const newCondition: DisplayLogicCondition = {
      questionId: TASK_RESULT_QUESTION_ID,
      operator: 'equals',
      values: ['success'],
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
  const getDefaultsForSource = (questionId: string): Partial<DisplayLogicCondition> => {
    const sourceType = getSourceType(questionId)
    switch (sourceType) {
      case 'task-result':
        return { operator: 'equals', values: ['success'] }
      case 'success-type':
        return { operator: 'equals', values: ['direct'] }
      case 'number':
        return { operator: 'greater_than', values: ['3'] }
      case 'time':
        return { operator: 'greater_than', values: ['30000'] } // 30 seconds
      case 'question':
      default:
        return { operator: 'equals', values: [] }
    }
  }
  const getSourceLabel = (questionId: string): string => {
    const source = ALL_SOURCES.find((s) => s.id === questionId)
    if (source) return source.label

    // Check previous questions
    const questionIndex = previousQuestions.findIndex((q) => q.id === questionId)
    if (questionIndex !== -1) {
      const q = previousQuestions[questionIndex]
      const text = q.question_text || q.text || 'Untitled'
      return `Q${questionIndex + 1}: ${text.slice(0, 25)}${text.length > 25 ? '...' : ''}`
    }

    return questionId
  }
  const renderValueInput = (condition: DisplayLogicCondition, index: number) => {
    const sourceType = getSourceType(condition.questionId)

    // No value needed for existence checks
    if (['is_answered', 'is_not_answered'].includes(condition.operator)) {
      return null
    }

    switch (sourceType) {
      case 'task-result':
        return (
          <Select
            value={condition.values?.[0] || 'success'}
            onValueChange={(value) => updateCondition(index, { values: [value] })}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_RESULT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'success-type':
        return (
          <Select
            value={condition.values?.[0] || 'direct'}
            onValueChange={(value) => updateCondition(index, { values: [value] })}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUCCESS_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'time':
        return (
          <TimeInput
            valueMs={condition.values?.[0]}
            onChange={(value) => updateCondition(index, { values: [value] })}
          />
        )

      case 'number':
        return (
          <Input
            type="number"
            min="0"
            placeholder="0"
            value={condition.values?.[0] || ''}
            onChange={(e) => updateCondition(index, { values: [e.target.value] })}
            className="w-20 flex-1"
          />
        )

      case 'question':
      default:
        return (
          <Input
            placeholder="Value"
            value={condition.values?.join(', ') || ''}
            onChange={(e) =>
              updateCondition(index, {
                values: e.target.value
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean),
              })
            }
            className="flex-1"
          />
        )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="enable-logic">Enable Display Logic</Label>
          <p className="text-xs text-muted-foreground">
            Show or hide based on task outcome, performance metrics, or previous answers
          </p>
        </div>
        <Switch id="enable-logic" checked={hasLogic} onCheckedChange={toggleLogic} />
      </div>

      {hasLogic && (
        <div className="space-y-4 rounded-lg border p-4">
          {/* Action and match type selectors */}
          <div className="flex items-center gap-2 flex-wrap">
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

          {/* Conditions list */}
          <div className="space-y-2">
            {logic.conditions.map((condition, index) => {
              const sourceType = getSourceType(condition.questionId)
              const operators = getOperatorsForSource(sourceType)

              return (
                <div
                  key={index}
                  className="flex items-start gap-2 rounded border bg-muted/30 p-2"
                >
                  <div className="flex-1 space-y-2">
                    {/* Source selector with grouped options */}
                    <Select
                      value={condition.questionId}
                      onValueChange={(value) =>
                        updateCondition(index, {
                          questionId: value,
                          ...getDefaultsForSource(value),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue>{getSourceLabel(condition.questionId)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {/* Task metrics groups */}
                        {CONDITION_SOURCES.map((group) => (
                          <SelectGroup key={group.category}>
                            <SelectLabel className="text-xs font-semibold text-muted-foreground">
                              {group.category}
                            </SelectLabel>
                            {group.options.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                <div className="flex flex-col">
                                  <span>{option.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}

                        {/* Previous questions (if any) */}
                        {previousQuestions.length > 0 && (
                          <SelectGroup>
                            <SelectLabel className="text-xs font-semibold text-muted-foreground">
                              Previous Questions
                            </SelectLabel>
                            {previousQuestions.map((q, idx) => (
                              <SelectItem key={q.id} value={q.id}>
                                Q{idx + 1}:{' '}
                                {(q.question_text || q.text || 'Untitled').slice(0, 30)}
                                {(q.question_text || q.text || '').length > 30 ? '...' : ''}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>

                    {/* Operator and value */}
                    <div className="flex gap-2">
                      <Select
                        value={condition.operator}
                        onValueChange={(value) =>
                          updateCondition(index, { operator: value as DisplayLogicOperator })
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {operators.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Value input */}
                      {renderValueInput(condition, index)}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeCondition(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={addCondition}>
              <Plus className="mr-2 h-4 w-4" />
              Add Condition
            </Button>
            <ConditionTemplates onSelectTemplate={(template) => onChange(template)} />
          </div>

          {/* Help text */}
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Use templates for common patterns like &ldquo;show if task
            failed&rdquo; or &ldquo;show if misclicks &gt; 3&rdquo;
          </p>
        </div>
      )}
    </div>
  )
}
