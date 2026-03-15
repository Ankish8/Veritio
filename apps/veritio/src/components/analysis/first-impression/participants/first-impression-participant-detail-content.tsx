'use client'

/**
 * First Impression Participant Detail Content
 *
 * Shows:
 * 1. Screening, Pre-study, and Post-study questionnaire responses
 * 2. Design exposures with their per-design question responses
 */

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Clock, Eye, MessageSquare, ClipboardList } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import { QuestionResponseCard } from '@/components/analysis/shared'
import type {
  FirstImpressionDesign,
  FirstImpressionExposure,
  FirstImpressionResponse,
} from '@/services/results/first-impression'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'

interface FirstImpressionParticipantDetailContentProps {
  /** All designs in the study */
  designs: FirstImpressionDesign[]
  /** Exposures for this participant */
  participantExposures: FirstImpressionExposure[]
  /** Responses for this participant (design questions) */
  participantResponses: FirstImpressionResponse[]
  /** Total design questions answered */
  responsesAnswered: number
  /** Total design questions across all designs */
  totalQuestions: number
  /** Study flow questions (screening, pre-study, post-study) */
  flowQuestions: StudyFlowQuestionRow[]
  /** Study flow responses for this participant */
  flowResponses: StudyFlowResponseRow[]
}

// Section types for questionnaire
type FlowSection = 'screening' | 'pre_study' | 'post_study'

const SECTION_CONFIG: Record<FlowSection, { title: string; icon: typeof ClipboardList }> = {
  screening: { title: 'Screening Questions', icon: ClipboardList },
  pre_study: { title: 'Pre-Study Questions', icon: MessageSquare },
  post_study: { title: 'Post-Study Questions', icon: MessageSquare },
}

/**
 * Content component for First Impression participant detail panel.
 * Shows questionnaire responses and design exposures with their questions.
 */
export function FirstImpressionParticipantDetailContent({
  designs,
  participantExposures,
  participantResponses,
  responsesAnswered,
  totalQuestions,
  flowQuestions,
  flowResponses,
}: FirstImpressionParticipantDetailContentProps) {
  // Build response map for flow questions
  const flowResponseMap = useMemo(() => {
    const map = new Map<string, StudyFlowResponseRow>()
    for (const response of flowResponses) {
      map.set(response.question_id, response)
    }
    return map
  }, [flowResponses])

  // Group flow questions by section
  const questionsBySection = useMemo(() => {
    const grouped: Record<FlowSection, StudyFlowQuestionRow[]> = {
      screening: [],
      pre_study: [],
      post_study: [],
    }
    for (const q of flowQuestions) {
      const section = q.section as FlowSection
      if (section in grouped) {
        grouped[section].push(q)
      }
    }
    return grouped
  }, [flowQuestions])

  // Group exposures with their design data
  const exposuresWithDesigns = useMemo(() => {
    return participantExposures
      .sort((a, b) => a.exposure_sequence - b.exposure_sequence)
      .map((exposure) => {
        const design = designs.find((d) => d.id === exposure.design_id)
        const responses = participantResponses.filter(
          (r) => r.exposure_id === exposure.id
        )
        return { exposure, design, responses }
      })
  }, [participantExposures, participantResponses, designs])

  // Check which sections have content
  const sections: FlowSection[] = ['screening', 'pre_study', 'post_study']
  const activeSections = sections.filter((s) => questionsBySection[s].length > 0)

  return (
    <div className="space-y-6">
      {/* Design Exposures Section - First, right after session info */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Design Exposures ({exposuresWithDesigns.length})
        </h3>

        {exposuresWithDesigns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
            <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No design exposures recorded</p>
          </div>
        ) : (
          <div className="space-y-4">
            {exposuresWithDesigns.map(({ exposure, design, responses }, index) => (
              <ExposureCard
                key={exposure.id}
                exposure={exposure}
                design={design}
                responses={responses}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Summary footer */}
        {totalQuestions > 0 && (
          <div className="pt-2 border-t text-xs text-muted-foreground flex items-center">
            <MessageSquare className="h-3 w-3 mr-1" />
            {responsesAnswered} of {totalQuestions} design questions answered
          </div>
        )}
      </div>

      {/* Questionnaire Sections (Screening, Pre-Study, Post-Study) */}
      {activeSections.map((section) => {
        const questions = questionsBySection[section]
        const config = SECTION_CONFIG[section]
        const Icon = config.icon
        const answeredCount = questions.filter((q) => flowResponseMap.has(q.id)).length

        return (
          <div key={section} className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {config.title} ({answeredCount} of {questions.length})
            </h3>

            <div className="space-y-3">
              {questions.map((question, index) => (
                <QuestionResponseCard
                  key={question.id}
                  question={question}
                  response={flowResponseMap.get(question.id)}
                  index={index}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Card showing a single design exposure with its responses
 */
function ExposureCard({
  exposure,
  design,
  responses,
  index,
}: {
  exposure: FirstImpressionExposure
  design: FirstImpressionDesign | undefined
  responses: FirstImpressionResponse[]
  index: number
}) {
  const designName = design?.name || `Design ${(design?.position ?? index) + 1}`
  const questions = design?.questions || []

  // Calculate question time if available
  const questionTimeMs = useMemo(() => {
    if (exposure.questions_started_at && exposure.questions_completed_at) {
      const start = new Date(exposure.questions_started_at).getTime()
      const end = new Date(exposure.questions_completed_at).getTime()
      return end - start
    }
    return null
  }, [exposure.questions_started_at, exposure.questions_completed_at])

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Exposure header */}
      <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            {index + 1}
          </Badge>
          <span className="font-medium text-sm truncate max-w-[200px]">
            {designName}
          </span>
          {design?.is_practice && (
            <Badge variant="secondary" className="text-xs">
              Practice
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1" title="Exposure time">
            <Eye className="h-3 w-3" />
            {exposure.actual_display_ms
              ? `${(exposure.actual_display_ms / 1000).toFixed(1)}s`
              : '—'}
          </span>
          {questionTimeMs && (
            <span className="flex items-center gap-1" title="Question time">
              <Clock className="h-3 w-3" />
              {formatTime(questionTimeMs)}
            </span>
          )}
        </div>
      </div>

      {/* Questions and responses */}
      {questions.length > 0 ? (
        <div className="divide-y">
          {questions.map((question, qIndex) => {
            const response = responses.find((r) => r.question_id === question.id)
            return (
              <DesignQuestionResponseRow
                key={question.id}
                question={question}
                response={response}
                index={qIndex}
              />
            )
          })}
        </div>
      ) : (
        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
          No questions for this design
        </div>
      )}
    </div>
  )
}

/**
 * Actual question shape from database (differs from TypeScript interface)
 */
interface ActualDesignQuestion {
  id: string
  question_text: string
  question_type: 'yes_no' | 'opinion_scale' | 'short_text' | 'long_text' | 'single_choice' | 'multiple_choice'
  position: number
  is_required: boolean
  config: {
    // yes_no config
    yesLabel?: string
    noLabel?: string
    styleType?: string
    // opinion_scale config
    leftLabel?: string
    rightLabel?: string
    middleLabel?: string
    scalePoints?: number
    scaleType?: string
    startAtZero?: boolean
    // choice config
    options?: string[]
  }
}

/**
 * Single design question and response row - shows question prompt with response
 */
function DesignQuestionResponseRow({
  question: rawQuestion,
  response,
  index,
}: {
  question: FirstImpressionDesign['questions'][0]
  response: FirstImpressionResponse | undefined
  index: number
}) {
  // Cast to actual shape since TypeScript types don't match database
  const question = rawQuestion as unknown as ActualDesignQuestion

  const promptText = question.question_text || `Question ${index + 1} (no prompt configured)`
  const typeLabel = getDesignQuestionTypeLabel(question.question_type)
  const hasPrompt = !!question.question_text

  return (
    <div className="px-3 py-3">
      {/* Question header with prompt */}
      <div className="flex items-start gap-2 mb-2">
        <Badge
          variant="outline"
          className="text-[12px] font-mono h-5 px-1.5 shrink-0"
        >
          Q{index + 1}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${hasPrompt ? 'font-medium' : 'text-muted-foreground italic'}`}>
            {promptText}
          </p>
          {typeLabel && (
            <Badge variant="secondary" className="text-[12px] mt-1">
              {typeLabel}
            </Badge>
          )}
        </div>
      </div>

      {/* Response */}
      <div className="pl-7">
        {response ? (
          <DesignResponseDisplay
            questionType={question.question_type}
            value={response.response_value}
            config={question.config}
          />
        ) : (
          <span className="text-sm text-muted-foreground italic">
            No response
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Get human-readable label for design question type
 */
function getDesignQuestionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    // Actual types from database
    yes_no: 'Yes/No',
    opinion_scale: 'Scale',
    short_text: 'Short Text',
    long_text: 'Long Text',
    single_choice: 'Single Choice',
    multiple_choice: 'Multiple Choice',
    // Legacy types (in case they exist)
    rating: 'Rating',
    scale: 'Scale',
  }
  return labels[type] || type
}

/**
 * Renders response value based on design question type
 */
function DesignResponseDisplay({
  questionType,
  value,
  config,
}: {
  questionType: string
  value: unknown
  config: ActualDesignQuestion['config']
}) {
  // Extract actual value if wrapped in object
  const actualValue = typeof value === 'object' && value !== null && 'value' in value
    ? (value as { value: unknown }).value
    : value

  switch (questionType) {
    case 'yes_no': {
      // Value is boolean (true/false)
      const boolValue = actualValue === true || actualValue === 'true'
      const yesLabel = config.yesLabel || 'Yes'
      const noLabel = config.noLabel || 'No'
      const displayValue = actualValue === true || actualValue === 'true' ? yesLabel : noLabel

      return (
        <div className="flex items-center gap-2">
          <Badge
            variant={boolValue ? 'default' : 'secondary'}
            className={boolValue ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
          >
            {displayValue}
          </Badge>
        </div>
      )
    }

    case 'opinion_scale': {
      // Value is a number (1-5 typically)
      const numValue = typeof actualValue === 'number' ? actualValue : parseInt(String(actualValue), 10)
      if (isNaN(numValue)) {
        return <span className="text-sm text-muted-foreground">—</span>
      }

      const scalePoints = config.scalePoints || 5
      const startAtZero = config.startAtZero || false
      const minValue = startAtZero ? 0 : 1

      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            {Array.from({ length: scalePoints }, (_, i) => {
              const pointValue = minValue + i
              const isSelected = pointValue === numValue
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
          {(config.leftLabel || config.rightLabel) && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{config.leftLabel}</span>
              <span>{config.rightLabel}</span>
            </div>
          )}
        </div>
      )
    }

    case 'single_choice': {
      const strValue = typeof actualValue === 'string' ? actualValue : null
      if (!strValue) {
        return <span className="text-sm text-muted-foreground">—</span>
      }
      return (
        <Badge variant="secondary" className="text-sm">
          {strValue}
        </Badge>
      )
    }

    case 'multiple_choice': {
      const arrValue = Array.isArray(actualValue) ? actualValue : null
      if (!arrValue || arrValue.length === 0) {
        return <span className="text-sm text-muted-foreground">—</span>
      }
      return (
        <div className="flex flex-wrap gap-1">
          {arrValue.map((v, i) => (
            <Badge key={i} variant="secondary" className="text-sm">
              {String(v)}
            </Badge>
          ))}
        </div>
      )
    }

    case 'short_text':
    case 'long_text': {
      const textValue = typeof actualValue === 'string' ? actualValue : null
      if (!textValue) {
        return <span className="text-sm text-muted-foreground">—</span>
      }
      return (
        <div className="bg-muted/30 rounded-lg p-3 text-sm whitespace-pre-wrap break-words">
          {textValue}
        </div>
      )
    }

    default: {
      if (actualValue === null || actualValue === undefined) {
        return <span className="text-sm text-muted-foreground">—</span>
      }
      return (
        <span className="text-sm">
          {typeof actualValue === 'object'
            ? JSON.stringify(actualValue)
            : String(actualValue)}
        </span>
      )
    }
  }
}
