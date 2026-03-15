'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import { ConditionTemplates } from './condition-templates'
import type {
  DisplayLogic,
  DisplayLogicCondition,
  DisplayLogicOperator,
  DisplayLogicAction,
} from '@veritio/study-types/study-flow-types'
import {
  TASK_RESULT_QUESTION_ID,
  TASK_DIRECT_SUCCESS_QUESTION_ID,
  getTaskMetricQuestionId,
  parseTaskMetricQuestionId,
} from '@veritio/study-types/study-flow-types'
import type { PostTaskQuestion } from '@veritio/study-types'

interface PostTaskQuestionDisplayLogicEditorProps {
  question: PostTaskQuestion
  previousQuestions: PostTaskQuestion[]
  onChange: (logic: DisplayLogic | null) => void
}

interface ConditionSourceOption {
  id: string
  label: string
  type: 'task-result' | 'success-type' | 'number' | 'time'
  description: string
}

type SourceType = ConditionSourceOption['type'] | 'question'

// Condition source definitions - grouped by category
const CONDITION_SOURCES = [
  {
    category: 'Task Outcome',
    options: [
      { id: TASK_RESULT_QUESTION_ID, label: 'Task result', type: 'task-result' as const, description: 'Success, failure, or skipped' },
      { id: TASK_DIRECT_SUCCESS_QUESTION_ID, label: 'Success type', type: 'success-type' as const, description: 'Direct (optimal path) or indirect' },
    ],
  },
  {
    category: 'Performance Metrics',
    options: [
      { id: getTaskMetricQuestionId('misclickCount'), label: 'Misclick count', type: 'number' as const, description: 'Clicks that didn\'t trigger actions' },
      { id: getTaskMetricQuestionId('clickCount'), label: 'Total clicks', type: 'number' as const, description: 'All clicks during the task' },
      { id: getTaskMetricQuestionId('backtrackCount'), label: 'Backtrack count', type: 'number' as const, description: 'Times user went back' },
    ],
  },
  {
    category: 'Time Metrics',
    options: [
      { id: getTaskMetricQuestionId('totalTimeMs'), label: 'Total time', type: 'time' as const, description: 'Time spent on task' },
      { id: getTaskMetricQuestionId('timeToFirstClickMs'), label: 'Time to first click', type: 'time' as const, description: 'Hesitation before first action' },
    ],
  },
  {
    category: 'Path Metrics',
    options: [
      { id: getTaskMetricQuestionId('pathLength'), label: 'Screens visited', type: 'number' as const, description: 'Number of frames navigated' },
    ],
  },
]

const ALL_SOURCES: ConditionSourceOption[] = CONDITION_SOURCES.flatMap((g) => g.options as ConditionSourceOption[])

type OperatorOption = { value: DisplayLogicOperator; label: string }

const TASK_RESULT_OPERATORS: OperatorOption[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
]

const NUMERIC_OPERATORS: OperatorOption[] = [
  { value: 'greater_than', label: 'is greater than' },
  { value: 'less_than', label: 'is less than' },
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
]

const QUESTION_OPERATORS: OperatorOption[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'is_answered', label: 'is answered' },
  { value: 'is_not_answered', label: 'is not answered' },
]

// Dropdown options for enum-based sources
const ENUM_OPTIONS: Record<string, { value: string; label: string }[]> = {
  'task-result': [
    { value: 'success', label: 'Success' },
    { value: 'failure', label: 'Failed / Gave up' },
    { value: 'skipped', label: 'Skipped' },
  ],
  'success-type': [
    { value: 'direct', label: 'Direct (optimal path)' },
    { value: 'indirect', label: 'Indirect (suboptimal path)' },
  ],
}

// Default fallback values per enum type
const ENUM_DEFAULTS: Record<string, string> = {
  'task-result': 'success',
  'success-type': 'direct',
}

function getSourceType(questionId: string): SourceType {
  const source = ALL_SOURCES.find((s) => s.id === questionId)
  if (source) return source.type

  const metric = parseTaskMetricQuestionId(questionId)
  if (metric) {
    return ['totalTimeMs', 'timeToFirstClickMs'].includes(metric) ? 'time' : 'number'
  }

  return 'question'
}

function getOperatorsForSource(sourceType: SourceType) {
  switch (sourceType) {
    case 'task-result':
    case 'success-type':
      return TASK_RESULT_OPERATORS
    case 'number':
    case 'time':
      return NUMERIC_OPERATORS
    default:
      return QUESTION_OPERATORS
  }
}

function getDefaultsForSource(questionId: string): Partial<DisplayLogicCondition> {
  const sourceType = getSourceType(questionId)
  switch (sourceType) {
    case 'task-result': return { operator: 'equals', values: ['success'] }
    case 'success-type': return { operator: 'equals', values: ['direct'] }
    case 'number': return { operator: 'greater_than', values: ['3'] }
    case 'time': return { operator: 'greater_than', values: ['30000'] }
    default: return { operator: 'equals', values: [] }
  }
}

function TimeInput({ valueMs, onChange }: { valueMs: string | undefined; onChange: (v: string) => void }) {
  const ms = parseInt(valueMs || '0', 10)
  const displayValue = ms > 0 ? (ms / 1000).toString() : ''

  return (
    <div className="flex items-center gap-2 flex-1">
      <Input
        type="number"
        min="0"
        step="0.1"
        placeholder="0"
        value={displayValue}
        onChange={(e) => {
          const seconds = parseFloat(e.target.value)
          onChange(!isNaN(seconds) ? (seconds * 1000).toString() : '')
        }}
        className="w-20"
      />
      <span className="text-sm text-muted-foreground">seconds</span>
    </div>
  )
}

/** Shared Select for enum-based value inputs (task-result, success-type) */
function EnumSelect({
  sourceType,
  value,
  onChange,
}: {
  sourceType: string
  value: string | undefined
  onChange: (v: string) => void
}) {
  const options = ENUM_OPTIONS[sourceType]
  if (!options) return null

  return (
    <Select value={value || ENUM_DEFAULTS[sourceType]} onValueChange={onChange}>
      <SelectTrigger className="flex-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
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

  const updateLogic = (updates: Partial<DisplayLogic>) => {
    onChange({ ...logic, ...updates })
  }

  const updateCondition = (index: number, updates: Partial<DisplayLogicCondition>) => {
    const newConditions = [...logic.conditions]
    newConditions[index] = { ...newConditions[index], ...updates }
    updateLogic({ conditions: newConditions })
  }

  const getSourceLabel = (questionId: string): string => {
    const source = ALL_SOURCES.find((s) => s.id === questionId)
    if (source) return source.label

    const questionIndex = previousQuestions.findIndex((q) => q.id === questionId)
    if (questionIndex !== -1) {
      const q = previousQuestions[questionIndex]
      const text = q.question_text || q.text || 'Untitled'
      return `Q${questionIndex + 1}: ${text.slice(0, 25)}${text.length > 25 ? '...' : ''}`
    }

    return questionId
  }

  const renderValueInput = (condition: DisplayLogicCondition, index: number) => {
    if (['is_answered', 'is_not_answered'].includes(condition.operator)) return null

    const sourceType = getSourceType(condition.questionId)
    const onValueChange = (value: string) => updateCondition(index, { values: [value] })

    if (sourceType === 'task-result' || sourceType === 'success-type') {
      return <EnumSelect sourceType={sourceType} value={condition.values?.[0]} onChange={onValueChange} />
    }

    if (sourceType === 'time') {
      return <TimeInput valueMs={condition.values?.[0]} onChange={onValueChange} />
    }

    if (sourceType === 'number') {
      return (
        <Input
          type="number"
          min="0"
          placeholder="0"
          value={condition.values?.[0] || ''}
          onChange={(e) => onValueChange(e.target.value)}
          className="w-20 flex-1"
        />
      )
    }

    // question type: comma-separated free text
    return (
      <Input
        placeholder="Value"
        value={condition.values?.join(', ') || ''}
        onChange={(e) =>
          updateCondition(index, {
            values: e.target.value.split(',').map((v) => v.trim()).filter(Boolean),
          })
        }
        className="flex-1"
      />
    )
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
        <Switch
          id="enable-logic"
          checked={hasLogic}
          onCheckedChange={(enabled) => {
            onChange(enabled ? { action: 'show', conditions: [], matchAll: true } : null)
          }}
        />
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
                <div key={index} className="flex items-start gap-2 rounded border bg-muted/30 p-2">
                  <div className="flex-1 space-y-2">
                    <Select
                      value={condition.questionId}
                      onValueChange={(value) =>
                        updateCondition(index, { questionId: value, ...getDefaultsForSource(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue>{getSourceLabel(condition.questionId)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_SOURCES.map((group) => (
                          <SelectGroup key={group.category}>
                            <SelectLabel className="text-xs font-semibold text-muted-foreground">
                              {group.category}
                            </SelectLabel>
                            {group.options.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                <span>{option.label}</span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}

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
                            <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {renderValueInput(condition, index)}
                    </div>
                  </div>

                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() =>
                    updateLogic({ conditions: logic.conditions.filter((_, i) => i !== index) })
                  }>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() =>
              updateLogic({
                conditions: [...logic.conditions, {
                  questionId: TASK_RESULT_QUESTION_ID,
                  operator: 'equals',
                  values: ['success'],
                }],
              })
            }>
              <Plus className="mr-2 h-4 w-4" />
              Add Condition
            </Button>
            <ConditionTemplates onSelectTemplate={(template) => onChange(template)} />
          </div>

          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Use templates for common patterns like &ldquo;show if task
            failed&rdquo; or &ldquo;show if misclicks &gt; 3&rdquo;
          </p>
        </div>
      )}
    </div>
  )
}
