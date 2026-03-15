'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { BarChart3 } from 'lucide-react'
import { useQuestionResponses, useChartPreference, useStatsPanelPreference, type ChartType } from './hooks'
import { ChartTypeSwitcher, getDefaultChartType } from './chart-type-switcher'
import {
  ChoiceVisualization,
  TextVisualization,
  NPSVisualization,
  LikertVisualization,
  MatrixVisualization,
  RankingVisualization,
  PieChartVisualization,
  VerticalBarVisualization,
  WordCloudVisualization,
  NumericalVisualization,
  DateVisualization,
  EmailVisualization,
  StackedBarLikert,
  DivergingBarLikert,
  NPSGaugeChart,
  NPSDonutChart,
  MatrixGroupedBar,
  MatrixStackedBar,
  RankingTableView,
  SliderVisualization,
  AudioResponseVisualization,
  ConstantSumVisualization,
  ConstantSumBarChart,
  ConstantSumPieChart,
  SemanticDifferentialVisualization,
  SemanticDifferentialHeatmap,
  SemanticDifferentialDistribution,
} from './response-visualizations'
import type { Participant, StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import type { QuestionType, TextInputType, TextQuestionConfig } from '@veritio/study-types/study-flow-types'
import { stripPipingSpansOnly } from '@/lib/utils'
import { AiFollowupResponsesPanel } from '@/components/analysis/survey/ai-followup-responses-panel'

interface QuestionDisplayProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
  participants: Participant[]
  questionIndex: number
  filteredParticipantIds: Set<string> | null
  hideEmptyResponses: boolean
  /** All flow questions for participant detail panel in visualizations */
  flowQuestions?: StudyFlowQuestionRow[]
  /** All flow responses for participant detail panel in visualizations */
  flowResponses?: StudyFlowResponseRow[]
  /** Study ID for evidence marking */
  studyId?: string
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_line_text: 'Text',
  multi_line_text: 'Long text',
  multiple_choice: 'Multiple Choice',
  yes_no: 'Yes/No',
  opinion_scale: 'Opinion Scale',
  nps: 'NPS',
  matrix: 'Matrix',
  ranking: 'Ranking',
  slider: 'Slider',
  image_choice: 'Image Choice',
  semantic_differential: 'Semantic Differential',
  constant_sum: 'Constant Sum',
  audio_response: 'Audio Response',
}

export function QuestionDisplay({
  question,
  responses,
  participants,
  questionIndex,
  filteredParticipantIds,
  hideEmptyResponses,
  flowQuestions,
  flowResponses,
  studyId,
}: QuestionDisplayProps) {
  const questionType = question.question_type as QuestionType
  const typeLabel = QUESTION_TYPE_LABELS[questionType] || questionType

  const inputType: TextInputType | undefined =
    (questionType === 'single_line_text' || questionType === 'multi_line_text')
      ? (question.config as TextQuestionConfig | null)?.inputType
      : undefined

  const defaultChartType = getDefaultChartType(questionType, inputType)

  const [chartType, setChartType] = useChartPreference(question.id, defaultChartType)
  const [isStatsOpen, setIsStatsOpen] = useStatsPanelPreference(question.id)

  const isTextQuestion = questionType === 'single_line_text' || questionType === 'multi_line_text'
  const supportsStatsPanel = isTextQuestion && chartType === 'response-table'

  const { filteredResponses } = useQuestionResponses({
    questionId: question.id,
    responses,
    filteredParticipantIds,
    hideEmptyResponses,
  })

  return (
    <div
      className="pt-6 pb-6 border-b border-border last:border-b-0 first:pt-0"
      data-pdf-chart={`question-${question.id}`}
      data-pdf-title={question.question_text || `Question ${questionIndex}`}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Question {questionIndex}</span>
            <span className="text-muted-foreground">·</span>
            <Badge variant="outline" className="text-xs font-normal">
              {typeLabel}
            </Badge>
          </div>

          {question.question_text_html ? (
            <div
              className="text-lg text-foreground font-medium"
              dangerouslySetInnerHTML={{ __html: stripPipingSpansOnly(question.question_text_html) }}
            />
          ) : (
            <p className="text-lg text-foreground font-medium">{question.question_text}</p>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {supportsStatsPanel && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isStatsOpen ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setIsStatsOpen(!isStatsOpen)}
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {isStatsOpen ? 'Hide statistics' : 'Show statistics'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <ChartTypeSwitcher
            questionType={questionType}
            currentChartType={chartType}
            onChartTypeChange={setChartType}
            inputType={inputType}
          />
        </div>
      </div>

      {filteredResponses.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No responses to display</p>
          {hideEmptyResponses && (
            <p className="text-xs mt-1">
              Try disabling &quot;Hide responses with no data&quot; to see all responses
            </p>
          )}
        </div>
      ) : (
        <QuestionVisualization
          questionType={questionType}
          chartType={chartType}
          question={question}
          responses={filteredResponses}
          participants={participants}
          filteredParticipantIds={filteredParticipantIds}
          inputType={inputType}
          isStatsOpen={isStatsOpen}
          setIsStatsOpen={setIsStatsOpen}
          flowQuestions={flowQuestions}
          flowResponses={flowResponses}
          studyId={studyId}
        />
      )}

      {/* AI follow-up Q&A for text questions */}
      {isTextQuestion && studyId && (
        <AiFollowupResponsesPanel studyId={studyId} questionId={question.id} />
      )}
    </div>
  )
}

function QuestionVisualization({
  questionType,
  chartType,
  question,
  responses,
  participants,
  filteredParticipantIds,
  inputType,
  isStatsOpen,
  setIsStatsOpen,
  flowQuestions,
  flowResponses,
  studyId,
}: {
  questionType: QuestionType
  chartType: ChartType
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
  participants: Participant[]
  filteredParticipantIds: Set<string> | null
  inputType?: TextInputType
  isStatsOpen: boolean
  setIsStatsOpen: (value: boolean) => void
  flowQuestions?: StudyFlowQuestionRow[]
  flowResponses?: StudyFlowResponseRow[]
  studyId?: string
}) {
  if (questionType === 'multiple_choice' || questionType === 'yes_no') {
    switch (chartType) {
      case 'pie-chart':
        return (
          <PieChartVisualization
            question={question}
            responses={responses}
            questionType={questionType}
          />
        )
      case 'vertical-bar':
        return (
          <VerticalBarVisualization
            question={question}
            responses={responses}
            questionType={questionType}
          />
        )
      case 'horizontal-bar':
      default:
        return (
          <ChoiceVisualization
            question={question}
            responses={responses}
            questionType={questionType}
          />
        )
    }
  }

  if (questionType === 'single_line_text' || questionType === 'multi_line_text') {
    // Specialized chart types for text input subtypes
    if (inputType === 'numerical' && chartType === 'numerical-histogram') {
      return <NumericalVisualization question={question} responses={responses} />
    }
    if (inputType === 'date' && chartType === 'date-timeline') {
      return <DateVisualization question={question} responses={responses} />
    }
    if (inputType === 'email' && chartType === 'email-domains') {
      return <EmailVisualization question={question} responses={responses} />
    }
    if (chartType === 'word-cloud') {
      return <WordCloudVisualization question={question} responses={responses} />
    }

    // Default: response table with stats panel
    return (
      <TextVisualization
        question={question}
        responses={responses}
        participants={participants}
        filteredParticipantIds={filteredParticipantIds}
        isStatsOpen={isStatsOpen}
        setIsStatsOpen={setIsStatsOpen}
        flowQuestions={flowQuestions}
        flowResponses={flowResponses}
        studyId={studyId}
      />
    )
  }

  if (questionType === 'nps') {
    switch (chartType) {
      case 'nps-gauge':
        return <NPSGaugeChart question={question} responses={responses} />
      case 'nps-donut':
        return <NPSDonutChart question={question} responses={responses} />
      case 'nps-default':
      default:
        return <NPSVisualization question={question} responses={responses} />
    }
  }

  if (questionType === 'opinion_scale') {
    switch (chartType) {
      case 'stacked-bar':
        return <StackedBarLikert question={question} responses={responses} />
      case 'diverging-bar':
        return <DivergingBarLikert question={question} responses={responses} />
      case 'distribution-table':
      default:
        return <LikertVisualization question={question} responses={responses} />
    }
  }

  if (questionType === 'matrix') {
    switch (chartType) {
      case 'grouped-bar':
        return <MatrixGroupedBar question={question} responses={responses} />
      case 'matrix-stacked-bar':
        return <MatrixStackedBar question={question} responses={responses} />
      case 'heat-map':
      default:
        return <MatrixVisualization question={question} responses={responses} />
    }
  }

  if (questionType === 'ranking') {
    switch (chartType) {
      case 'rank-table':
        return <RankingTableView question={question} responses={responses} />
      case 'rank-distribution':
      default:
        return <RankingVisualization question={question} responses={responses} />
    }
  }

  if (questionType === 'slider') {
    return <SliderVisualization question={question} responses={responses} />
  }

  if (questionType === 'audio_response') {
    return (
      <AudioResponseVisualization
        question={question}
        responses={responses}
        participants={participants}
        filteredParticipantIds={filteredParticipantIds}
      />
    )
  }

  if (questionType === 'constant_sum') {
    switch (chartType) {
      case 'constant-sum-bars':
        return <ConstantSumBarChart question={question} responses={responses} />
      case 'constant-sum-pie':
        return <ConstantSumPieChart question={question} responses={responses} />
      case 'constant-sum-table':
      default:
        return <ConstantSumVisualization question={question} responses={responses} />
    }
  }

  if (questionType === 'semantic_differential') {
    switch (chartType) {
      case 'semantic-diff-heatmap':
        return <SemanticDifferentialHeatmap question={question} responses={responses} />
      case 'semantic-diff-distribution':
        return <SemanticDifferentialDistribution question={question} responses={responses} />
      case 'semantic-diff-profile':
      default:
        return <SemanticDifferentialVisualization question={question} responses={responses} />
    }
  }

  return (
    <div className="text-center py-4 text-muted-foreground">
      <p className="text-sm">Visualization not available for this question type</p>
    </div>
  )
}
