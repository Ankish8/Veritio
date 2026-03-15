'use client'

import { useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Monitor, Tablet, Smartphone } from 'lucide-react'
import type { SegmentCondition, SegmentConditionType, SegmentConditionOperator } from '@veritio/study-types'
import {
  getConditionsByTier,
  getOperatorsForValueType,
  getConditionDefinition,
  TIER_LABELS,
  type StudyType,
  type ConditionTier,
  type DesignOption,
  type ResponseTagOption,
} from '@/lib/segment-conditions'
import type { QuestionOption, UrlTagOption } from './types'

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'abandoned', label: 'Abandoned' },
  { value: 'in_progress', label: 'In Progress' },
]

const DEVICE_TYPE_OPTIONS = [
  { value: 'desktop', label: 'Desktop', icon: Monitor },
  { value: 'tablet', label: 'Tablet', icon: Tablet },
  { value: 'mobile', label: 'Mobile', icon: Smartphone },
]

export interface ConditionBuilderProps {
  condition: SegmentCondition
  onChange: (updates: Partial<SegmentCondition>) => void
  onRemove: () => void
  studyType?: StudyType
  questions?: QuestionOption[]
  urlTags?: UrlTagOption[]
  categoriesRange?: { min: number; max: number }
  timeRange?: { min: number; max: number }
  designs?: DesignOption[]
  responseTags?: ResponseTagOption[]
  index: number
}

export function ConditionBuilder({
  condition,
  onChange,
  onRemove,
  studyType = 'card_sort',
  questions = [],
  urlTags = [],
  categoriesRange: _categoriesRange = { min: 0, max: 20 },
  timeRange: _timeRange = { min: 0, max: 600 },
  designs = [],
  responseTags = [],
  index,
}: ConditionBuilderProps) {
  const conditionsByTier = useMemo(() => getConditionsByTier(studyType), [studyType])

  const conditionDef = useMemo(
    () => getConditionDefinition(studyType, condition.type),
    [studyType, condition.type]
  )

  const operators = useMemo(() => {
    if (!conditionDef) return getOperatorsForValueType('text')
    return getOperatorsForValueType(conditionDef.valueType)
  }, [conditionDef])

  const handleTypeChange = (type: SegmentConditionType) => {
    const newDef = getConditionDefinition(studyType, type)
    const newOperators = newDef ? getOperatorsForValueType(newDef.valueType) : []
    const defaultOperator = newOperators[0]?.value || 'equals'
    onChange({
      type,
      operator: defaultOperator,
      value: '',
      questionId: undefined,
      questionText: undefined,
      tagKey: undefined,
      designId: undefined,
      responseTagId: undefined,
      responseTagName: undefined,
    })
  }

  const handleOperatorChange = (operator: SegmentConditionOperator) => {
    if (operator === 'between') {
      onChange({ operator, value: [0, 0] })
    } else {
      onChange({ operator, value: '' })
    }
  }

  const handleQuestionChange = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId)
    onChange({
      questionId,
      questionText: question?.text || '',
      value: '',
    })
  }

  const handleTagKeyChange = (tagKey: string) => {
    onChange({ tagKey, value: '' })
  }

  const handleDesignChange = (designId: string) => {
    const design = designs.find((d) => d.id === designId)
    onChange({
      designId,
      value: design?.name || designId,
    })
  }

  const handleResponseTagChange = (tagId: string) => {
    const tag = responseTags.find((t) => t.id === tagId)
    onChange({
      responseTagId: tagId,
      responseTagName: tag?.name || '',
      value: tag?.name || tagId,
    })
  }

  const selectedQuestion = useMemo(() => {
    return questions.find((q) => q.id === condition.questionId)
  }, [questions, condition.questionId])

  const selectedTagValues = useMemo(() => {
    const tag = urlTags.find((t) => t.key === condition.tagKey)
    return tag?.values || []
  }, [urlTags, condition.tagKey])

  const renderNumericInput = ({ placeholder, width, min, max, suffix }: {
    placeholder: string; width: string; min?: number; max?: number; suffix?: string
  }) => {
    if (condition.operator === 'between') {
      const [lo, hi] = Array.isArray(condition.value)
        ? (condition.value as [number, number])
        : [0, 0]
      const unit = conditionDef?.unit || ''
      const minLabel = suffix ? `Min ${suffix}` : `Min${unit ? ` (${unit})` : ''}`
      const maxLabel = suffix ? `Max ${suffix}` : `Max${unit ? ` (${unit})` : ''}`
      return (
        <>
          <Input type="number" placeholder={minLabel} value={lo || ''} onChange={(e) => onChange({ value: [parseInt(e.target.value) || 0, hi] })} className={width} min={min} max={max} />
          <span className="text-muted-foreground">and</span>
          <Input type="number" placeholder={maxLabel} value={hi || ''} onChange={(e) => onChange({ value: [lo, parseInt(e.target.value) || 0] })} className={width} min={min} max={max} />
        </>
      )
    }
    const input = (
      <Input type="number" placeholder={placeholder} value={typeof condition.value === 'number' ? condition.value : ''} onChange={(e) => onChange({ value: parseInt(e.target.value) || 0 })} className={width} min={min} max={max} />
    )
    return suffix ? (
      <div className="flex items-center gap-1">{input}<span className="text-muted-foreground text-sm">{suffix}</span></div>
    ) : input
  }

  const renderValueInput = () => {
    switch (condition.type) {
      case 'status':
        return (
          <Select value={condition.value as string} onValueChange={(v) => onChange({ value: v })}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'device_type':
        return (
          <Select value={condition.value as string} onValueChange={(v) => onChange({ value: v })}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Select device" />
            </SelectTrigger>
            <SelectContent>
              {DEVICE_TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon
                return (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {opt.label}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        )

      case 'design_assignment':
        return (
          <Select
            value={condition.designId || ''}
            onValueChange={handleDesignChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select design" />
            </SelectTrigger>
            <SelectContent>
              {designs.map((design) => (
                <SelectItem key={design.id} value={design.id}>
                  {design.name || `Design ${(design.position ?? 0) + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'response_tag':
        return (
          <Select
            value={condition.responseTagId || ''}
            onValueChange={handleResponseTagChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select tag" />
            </SelectTrigger>
            <SelectContent>
              {responseTags.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No tags created yet
                </div>
              ) : (
                responseTags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )

      case 'question_response':
        return (
          <>
            {/* Question selector */}
            <Select value={condition.questionId || ''} onValueChange={handleQuestionChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select question" />
              </SelectTrigger>
              <SelectContent>
                {questions.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    <span className="truncate max-w-[180px]">{q.text}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Answer input - dropdown or text based on question type */}
            {selectedQuestion && selectedQuestion.options && selectedQuestion.options.length > 0 ? (
              <Select
                value={condition.value as string}
                onValueChange={(v) => onChange({ value: v })}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select answer" />
                </SelectTrigger>
                <SelectContent>
                  {selectedQuestion.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : selectedQuestion ? (
              <Input
                type="text"
                placeholder="Enter answer"
                value={(condition.value as string) || ''}
                onChange={(e) => onChange({ value: e.target.value })}
                className="w-full sm:w-[180px]"
              />
            ) : null}
          </>
        )

      case 'url_tag':
        return (
          <>
            {/* Tag key selector */}
            <Select value={condition.tagKey || ''} onValueChange={handleTagKeyChange}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Tag key" />
              </SelectTrigger>
              <SelectContent>
                {urlTags.map((tag) => (
                  <SelectItem key={tag.key} value={tag.key}>
                    {tag.key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tag value selector */}
            {condition.tagKey && selectedTagValues.length > 0 ? (
              <Select
                value={condition.value as string}
                onValueChange={(v) => onChange({ value: v })}
              >
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Select value" />
                </SelectTrigger>
                <SelectContent>
                  {selectedTagValues.map((val) => (
                    <SelectItem key={val} value={val}>
                      {val}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : condition.tagKey ? (
              <Input
                type="text"
                placeholder="Enter value"
                value={(condition.value as string) || ''}
                onChange={(e) => onChange({ value: e.target.value })}
                className="w-full sm:w-[140px]"
              />
            ) : null}
          </>
        )

      // Numeric conditions
      case 'categories_created':
      case 'time_taken':
      case 'tasks_completed':
      case 'misclick_count':
      case 'questions_answered':
        return renderNumericInput({ placeholder: conditionDef?.unit || 'Count', width: 'w-[120px]' })

      // Percentage conditions
      case 'response_rate':
      case 'task_success_rate':
      case 'direct_success_rate':
      case 'correct_clicks_rate':
        return renderNumericInput({ placeholder: '0-100', width: 'w-[100px]', min: 0, max: 100, suffix: '%' })

      case 'participant_id':
        return (
          <Input
            type="text"
            placeholder="Participant ID"
            value={(condition.value as string) || ''}
            onChange={(e) => onChange({ value: e.target.value })}
            className="w-full sm:w-[200px]"
          />
        )

      default:
        return null
    }
  }

  const renderConditionTypeDropdown = () => {
    const tiers: ConditionTier[] = ['essential', 'quality', 'advanced']

    return (
      <Select value={condition.type} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Select condition" />
        </SelectTrigger>
        <SelectContent>
          {tiers.map((tier, tierIndex) => {
            const tierConditions = conditionsByTier[tier]
            if (tierConditions.length === 0) return null

            return (
              <SelectGroup key={tier}>
                {tierIndex > 0 && <SelectSeparator />}
                <SelectLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {TIER_LABELS[tier]}
                </SelectLabel>
                {tierConditions.map((def) => (
                  <SelectItem key={def.type} value={def.type}>
                    {def.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            )
          })}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
      {/* Condition number label */}
      <span className="text-sm text-muted-foreground w-20 shrink-0">Condition {index + 1}</span>

      {/* Type selector - tier-grouped */}
      {renderConditionTypeDropdown()}

      {/* Operator selector */}
      <Select value={condition.operator} onValueChange={handleOperatorChange}>
        <SelectTrigger className="w-full sm:w-[130px]">
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input(s) */}
      {renderValueInput()}

      {/* Remove button */}
      <Button variant="ghost" size="icon" onClick={onRemove} className="shrink-0 ml-auto">
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
