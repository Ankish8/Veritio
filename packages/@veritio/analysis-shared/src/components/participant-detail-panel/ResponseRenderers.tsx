'use client'

import { Badge } from '@veritio/ui/components/badge'
import { CheckCircle2, Circle } from 'lucide-react'
import { stripPipingHtml } from '@veritio/ui'
import type {
  StudyFlowQuestionRow,
  StudyFlowResponseRow,
  MatrixQuestionConfig,
  RankingQuestionConfig,
  MultipleChoiceQuestionConfig,
  OpinionScaleQuestionConfig,
  MatrixResponseValue,
  ConstantSumQuestionConfig,
  ConstantSumResponseValue,
  AudioResponseValue,
} from '@veritio/core'

// Evidence source types (temporarily defined locally)
type EvidenceSourceType =
  | 'card_sort_response'
  | 'tree_test_response'
  | 'survey_response'
  | 'first_click_response'
  | 'first_impression_response'
  | 'prototype_test_response'
  | 'recording_clip'

interface QuestionResponseProps {
  question: StudyFlowQuestionRow
  response: StudyFlowResponseRow | undefined
  index: number
  studyId?: string
  sourceType?: EvidenceSourceType
}
export function QuestionResponseCard({ question, response, index, studyId: _studyId, sourceType: _sourceType }: QuestionResponseProps) {
  const hasResponse = response?.response_value !== null &&
    response?.response_value !== undefined &&
    response?.response_value !== ''

  // Build snapshot for evidence marking
  const _snapshot = hasResponse && response ? {
    question_text: question.question_text,
    question_type: question.question_type,
    response_value: response.response_value,
  } : undefined

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Question header */}
      <div className="flex items-start gap-3">
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
          Q{index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{stripPipingHtml(question.question_text)}</p>
          <Badge variant="outline" className="text-xs mt-1.5">
            {getQuestionTypeLabel(question.question_type)}
          </Badge>
        </div>
        {/* Evidence Button - temporarily disabled, needs app component dependencies
        {studyId && sourceType && hasResponse && response && (
          <MarkAsEvidenceButton
            studyId={studyId}
            sourceType={sourceType}
            sourceId={response.id}
            snapshot={snapshot}
            size="sm"
            className="h-6 w-6 shrink-0"
          />
        )}
        */}
      </div>

      {/* Response */}
      <div className="pl-9">
        {!hasResponse ? (
          <p className="text-sm text-muted-foreground italic">No response</p>
        ) : (
          <ResponseVisualization question={question} response={response!} />
        )}
      </div>
    </div>
  )
}
function ResponseVisualization({
  question,
  response,
}: {
  question: StudyFlowQuestionRow
  response: StudyFlowResponseRow
}) {
  const value = response.response_value
  const config = question.config as unknown

  switch (question.question_type) {
    case 'matrix':
      return <MatrixResponse config={config as MatrixQuestionConfig} value={value as MatrixResponseValue} />

    case 'nps':
      return <NPSResponse value={value as number} />

    case 'opinion_scale':
      return <OpinionScaleResponse config={config as OpinionScaleQuestionConfig} value={value as number} />

    case 'ranking':
      return <RankingResponse config={config as RankingQuestionConfig} value={value as string[]} />

    case 'multiple_choice':
      return <MultipleChoiceResponse config={config as MultipleChoiceQuestionConfig} value={value} />

    case 'yes_no':
      return <YesNoResponse value={value as boolean} />

    case 'single_line_text':
    case 'multi_line_text':
      return <TextResponse value={value as string} />

    case 'slider':
      return <SliderResponse value={value as number} />

    case 'constant_sum':
      return <ConstantSumResponse config={config as ConstantSumQuestionConfig} value={value as ConstantSumResponseValue} />

    case 'audio_response':
      return <AudioResponse value={value as unknown as AudioResponseValue} />

    default:
      return <GenericResponse value={value} />
  }
}

// Matrix Question Response
function MatrixResponse({ config, value }: { config: MatrixQuestionConfig; value: MatrixResponseValue }) {
  if (!config?.rows || !config?.columns) {
    return <GenericResponse value={value} />
  }

  // Normalize rows/columns: handle both { id, label } objects and plain strings
  const rows = config.rows.map((row) =>
    typeof row === 'string' ? { id: row, label: row } : row
  )
  const columns = config.columns.map((col) =>
    typeof col === 'string' ? { id: col, label: col } : col
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left py-1.5 pr-3 text-muted-foreground font-normal"></th>
            {columns.map((col, i) => (
              <th key={col.id ?? i} className="text-center py-1.5 px-2 text-muted-foreground font-normal min-w-[60px]">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => {
            // Try ID lookup first, then label lookup (for plain label-keyed responses)
            const selectedCol = value?.[row.id] ?? (row.id !== row.label ? value?.[row.label] : undefined)
            const selectedCols = Array.isArray(selectedCol) ? selectedCol : selectedCol ? [selectedCol] : []

            return (
              <tr key={row.id ?? rowIdx} className="border-t border-border/50">
                <td className="py-2 pr-3 font-medium">{row.label}</td>
                {columns.map((col, colIdx) => {
                  // Match by column ID or label (for plain label values)
                  const isSelected = selectedCols.includes(col.id) || (col.id !== col.label && selectedCols.includes(col.label))
                  return (
                    <td key={col.id ?? colIdx} className="text-center py-2 px-2">
                      {isSelected ? (
                        <CheckCircle2 className="h-4 w-4 text-primary mx-auto" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// NPS Response (0-10 scale)
// Note: NPS responses are stored as { value: number } (ScaleResponseValue)
function NPSResponse({ value }: { value: number | { value: number } }) {
  // Handle both plain number and { value: number } formats
  let score: number
  if (typeof value === 'number') {
    score = value
  } else if (typeof value === 'object' && value !== null && 'value' in value) {
    score = typeof value.value === 'number' ? value.value : parseInt(String(value.value), 10)
  } else {
    score = parseInt(String(value), 10)
  }

  // Handle NaN case (invalid data)
  if (Number.isNaN(score)) {
    return <p className="text-sm text-muted-foreground italic">Invalid response</p>
  }

  const category = score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor'
  const categoryColors = {
    promoter: 'bg-green-500',
    passive: 'bg-yellow-500',
    detractor: 'bg-red-500',
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: 11 }, (_, i) => (
          <div
            key={i}
            className={`
              w-7 h-7 rounded flex items-center justify-center text-xs font-medium
              ${i === score ? `${categoryColors[category]} text-white` : 'bg-muted text-muted-foreground'}
            `}
          >
            {i}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Not likely</span>
        <span>Very likely</span>
      </div>
    </div>
  )
}

// Slider Question Response
function SliderResponse({ value }: { value: number }) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return <p className="text-sm text-muted-foreground italic">Invalid response</p>
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-lg font-semibold text-primary">{value}</span>
    </div>
  )
}

// Opinion Scale Response
// Note: Scale responses may be stored as { value: number } (ScaleResponseValue)
function OpinionScaleResponse({ config, value }: { config: OpinionScaleQuestionConfig; value: number | { value: number } }) {
  const points = config?.scalePoints || 5
  const startAtZero = config?.startAtZero || false
  const scaleType = config?.scaleType || 'numerical'

  // Handle both plain number and { value: number } formats
  let score: number
  if (typeof value === 'number') {
    score = value
  } else if (typeof value === 'object' && value !== null && 'value' in value) {
    score = typeof value.value === 'number' ? value.value : parseInt(String(value.value), 10)
  } else {
    score = parseInt(String(value), 10)
  }

  // Handle NaN case (invalid data)
  if (Number.isNaN(score)) {
    return <p className="text-sm text-muted-foreground italic">Invalid response</p>
  }

  const start = startAtZero ? 0 : 1
  const end = startAtZero ? points - 1 : points

  if (scaleType === 'stars') {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: points }, (_, i) => {
          const pointValue = start + i
          const isFilled = pointValue <= score
          return (
            <span key={i} className={`text-lg ${isFilled ? 'text-yellow-400' : 'text-muted-foreground/30'}`}>
              ★
            </span>
          )
        })}
        <span className="text-sm text-muted-foreground ml-2">({score}/{end})</span>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        {Array.from({ length: points }, (_, i) => {
          const pointValue = start + i
          const isSelected = pointValue === score
          return (
            <div
              key={i}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
              `}
            >
              {pointValue}
            </div>
          )
        })}
      </div>
      {(config?.leftLabel || config?.rightLabel) && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{config?.leftLabel}</span>
          <span>{config?.rightLabel}</span>
        </div>
      )}
    </div>
  )
}

// Ranking Response
function RankingResponse({ config, value }: { config: RankingQuestionConfig; value: string[] }) {
  if (!config?.items || !Array.isArray(value)) {
    return <GenericResponse value={value} />
  }

  const itemMap = new Map(config.items.map((item) => [item.id, item.label]))

  return (
    <div className="space-y-1.5">
      {value.map((itemId, index) => (
        <div key={itemId} className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-sm">{itemMap.get(itemId) || itemId}</span>
        </div>
      ))}
    </div>
  )
}

// Multiple Choice Response
function MultipleChoiceResponse({ config, value }: { config: MultipleChoiceQuestionConfig; value: unknown }) {
  if (!config?.options) {
    return <GenericResponse value={value} />
  }

  const optionMap = new Map(config.options.map((opt) => [opt.id, opt.label]))

  // Handle different value shapes
  let selectedIds: string[] = []
  let otherText: string | undefined

  // Check Array.isArray BEFORE typeof 'object' since arrays are objects
  if (Array.isArray(value)) {
    selectedIds = value as string[]
  } else if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>
    if ('optionIds' in obj && Array.isArray(obj.optionIds)) {
      selectedIds = obj.optionIds as string[]
    } else if ('optionId' in obj) {
      selectedIds = [obj.optionId as string]
    }
    otherText = obj.otherText as string | undefined
  } else if (typeof value === 'string') {
    selectedIds = [value]
  }

  const selectedLabels = selectedIds
    .map((id) => {
      // Try ID lookup first (standard format: UUIDs)
      const label = optionMap.get(id)
      if (label) return label
      // Try direct label match (plain label strings)
      if (config.options.some(opt => opt.label === id)) return id
      return prettifyId(id)
    })
    .filter(Boolean)

  if (otherText) {
    selectedLabels.push(`Other: ${otherText}`)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {selectedLabels.map((label, i) => (
        <Badge key={i} variant="secondary" className="text-sm">
          {label}
        </Badge>
      ))}
    </div>
  )
}

// Constant Sum Response
function ConstantSumResponse({ config, value }: { config: ConstantSumQuestionConfig; value: ConstantSumResponseValue }) {
  if (!config?.items || !value || typeof value !== 'object') {
    return <GenericResponse value={value} />
  }

  const itemMap = new Map(config.items.map((item) => [item.id, item.label]))
  const totalAllocated = Object.values(value).reduce((sum, v) => sum + (v || 0), 0)
  const totalPoints = config.totalPoints ?? 100

  return (
    <div className="space-y-2">
      {config.items.map((item) => {
        const allocated = value[item.id] ?? 0
        const percentage = totalPoints > 0 ? (allocated / totalPoints) * 100 : 0

        return (
          <div key={item.id} className="flex items-center gap-3">
            <span className="text-sm flex-1 truncate">{itemMap.get(item.id) || item.id}</span>
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
            </div>
            <span className="text-sm font-medium w-12 text-right">{allocated}</span>
            <span className="text-xs text-muted-foreground w-12">({Math.round(percentage)}%)</span>
          </div>
        )
      })}
      <div className="text-xs text-muted-foreground pt-2 border-t">
        Total: {totalAllocated} / {totalPoints}
      </div>
    </div>
  )
}

// Yes/No Response
function YesNoResponse({ value }: { value: boolean }) {
  return (
    <Badge variant={value ? 'default' : 'secondary'} className="text-sm">
      {value ? 'Yes' : 'No'}
    </Badge>
  )
}

// Audio Response
function AudioResponse({ value }: { value: AudioResponseValue }) {
  if (!value?.recordingId) {
    return <p className="text-sm text-muted-foreground italic">No audio recorded</p>
  }

  const durationMs = value.durationMs || 0
  const seconds = Math.floor(durationMs / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const duration = `${mins}:${secs.toString().padStart(2, '0')}`

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="text-sm flex items-center gap-1.5">
        <span className="text-xs">🎤</span>
        Audio Response
      </Badge>
      <span className="text-xs text-muted-foreground font-mono">{duration}</span>
    </div>
  )
}

// Text Response
function TextResponse({ value }: { value: string }) {
  return (
    <div className="bg-muted/30 rounded-lg p-3 text-sm whitespace-pre-wrap">
      {value}
    </div>
  )
}

// Generic fallback
function GenericResponse({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') {
    return <p className="text-sm text-muted-foreground italic">No response</p>
  }

  const formatted = formatGenericValue(value)
  return <p className="text-sm">{formatted}</p>
}

// Helpers

function getQuestionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    single_line_text: 'Short Text',
    multi_line_text: 'Long Text',
    multiple_choice: 'Selection',
    opinion_scale: 'Scale',
    yes_no: 'Yes/No',
    nps: 'NPS',
    matrix: 'Matrix',
    ranking: 'Ranking',
    slider: 'Slider',
    semantic_differential: 'Semantic Differential',
    constant_sum: 'Constant Sum',
    audio_response: 'Audio Response',
  }
  return labels[type] || type
}

function prettifyId(id: string): string {
  if (!id) return ''
  return id
    .replace(/^(opt_|option_|row_|col_|item_|q\d+_)/i, '')
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function formatGenericValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.map(formatGenericValue).join(', ')
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>
    if ('optionId' in obj) return prettifyId(String(obj.optionId))
    if ('optionIds' in obj && Array.isArray(obj.optionIds)) {
      return (obj.optionIds as string[]).map(prettifyId).join(', ')
    }
    if ('value' in obj) return formatGenericValue(obj.value)
    return Object.entries(obj)
      .map(([k, v]) => `${prettifyId(k)}: ${formatGenericValue(v)}`)
      .join(', ')
  }
  return String(value)
}
