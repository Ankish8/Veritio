'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import type {
  StudyFlowQuestion,
  ResponseValue,
  TextQuestionConfig,
  NPSQuestionConfig,
  MatrixQuestionConfig,
  RankingQuestionConfig,
  MultipleChoiceQuestionConfig,
  OpinionScaleQuestionConfig,
  YesNoQuestionConfig,
  SliderQuestionConfig,
  ImageChoiceQuestionConfig,
  SemanticDifferentialQuestionConfig,
  SemanticDifferentialResponseValue,
  ConstantSumQuestionConfig,
  ConstantSumResponseValue,
  AudioResponseQuestionConfig,
  AudioResponseValue,
} from '@veritio/study-types/study-flow-types'
import { useAllQuestionsForPiping, useResponsesForPiping } from '@/stores/study-flow-player'
import { resolveAllPipingReferences, hasPipingReferences } from '@/lib/study-flow/answer-piping'
import { SingleLineTextRenderer } from './single-line-text'
import { MultiLineTextRenderer } from './multi-line-text'
import { NPSRenderer } from './nps-question'
import { MatrixRenderer } from './matrix-question'
import { MultipleChoiceQuestion } from './multiple-choice-question'
import { OpinionScaleQuestion } from './opinion-scale-question'
import { YesNoQuestion } from './yes-no-question'
import { SliderQuestion } from './slider-question'
import { ImageChoiceQuestion } from './image-choice-question'
import { SemanticDifferentialQuestion } from './semantic-differential-question'
import { ConstantSumQuestion } from './constant-sum-question'
import { AudioResponseQuestion } from './audio-response-question'

// PERFORMANCE: Dynamically import RankingRenderer to avoid bundling @dnd-kit
// for surveys that don't have ranking questions (saves ~30KB)
const RankingRenderer = dynamic(
  () => import('./ranking-question').then(mod => ({ default: mod.RankingRenderer })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: false,
  }
)

interface QuestionRendererProps {
  question: StudyFlowQuestion
  value: ResponseValue | undefined
  onChange: (value: ResponseValue) => void
  showKeyboardHints?: boolean
  onSelectionComplete?: () => void
  onEnterPress?: () => void
  onTextFocusChange?: (focused: boolean) => void
  recordingContext?: {
    studyId: string
    participantId: string
    sessionToken: string
  }
}

export function QuestionRenderer({
  question,
  value,
  onChange,
  showKeyboardHints = false,
  onSelectionComplete,
  onEnterPress,
  onTextFocusChange,
  recordingContext,
}: QuestionRendererProps) {
  const { question_type, question_text, question_text_html, description, is_required, config } = question

  // Get all questions and responses for answer piping
  const allQuestions = useAllQuestionsForPiping()
  const responsesArray = useResponsesForPiping()

  // Convert responses array to Map (memoized to avoid re-creation)
  const responses = useMemo(() => {
    const map = new Map<string, ResponseValue>()
    responsesArray.forEach((resp) => {
      map.set(resp.questionId, resp.value)
    })
    return map
  }, [responsesArray])

  // Resolve piping references in question text, HTML, and description
  const resolvedText = useMemo(() => {
    if (!question_text || !hasPipingReferences(question_text)) return question_text
    return resolveAllPipingReferences(question_text, allQuestions, responses)
  }, [question_text, allQuestions, responses])

  const resolvedHtml = useMemo(() => {
    if (!question_text_html || !hasPipingReferences(question_text_html)) return question_text_html
    return resolveAllPipingReferences(question_text_html, allQuestions, responses)
  }, [question_text_html, allQuestions, responses])

  const resolvedDescription = useMemo(() => {
    if (!description || !hasPipingReferences(description)) return description
    return resolveAllPipingReferences(description, allQuestions, responses)
  }, [description, allQuestions, responses])

  const renderQuestion = () => {
    switch (question_type) {
      case 'single_line_text':
        return (
          <SingleLineTextRenderer
            config={config as TextQuestionConfig}
            value={value as string | undefined}
            onChange={onChange}
            showKeyboardHints={showKeyboardHints}
            onEnterPress={onEnterPress}
            onFocusChange={onTextFocusChange}
          />
        )
      case 'multi_line_text':
        return (
          <MultiLineTextRenderer
            config={config as TextQuestionConfig}
            value={value as string | undefined}
            onChange={onChange}
            showKeyboardHints={showKeyboardHints}
            onCmdEnterPress={onEnterPress}
            onFocusChange={onTextFocusChange}
          />
        )
      case 'nps':
        return (
          <NPSRenderer
            config={config as NPSQuestionConfig}
            value={value}
            onChange={onChange}
            showKeyboardHints={showKeyboardHints}
            onSelectionComplete={onSelectionComplete}
          />
        )
      case 'matrix':
        return (
          <MatrixRenderer
            config={config as MatrixQuestionConfig}
            value={value}
            onChange={onChange}
            showKeyboardHints={showKeyboardHints}
            onSelectionComplete={onSelectionComplete}
          />
        )
      case 'ranking':
        return (
          <RankingRenderer
            config={config as RankingQuestionConfig}
            value={value}
            onChange={onChange}
          />
        )
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion
            config={config as MultipleChoiceQuestionConfig}
            value={value}
            onChange={onChange}
            showKeyboardHints={showKeyboardHints}
            onSelectionComplete={onSelectionComplete}
          />
        )
      case 'opinion_scale':
        return (
          <OpinionScaleQuestion
            config={config as OpinionScaleQuestionConfig}
            value={value as number | undefined}
            onChange={onChange}
            showKeyboardHints={showKeyboardHints}
            onSelectionComplete={onSelectionComplete}
          />
        )
      case 'yes_no':
        return (
          <YesNoQuestion
            config={config as YesNoQuestionConfig}
            value={value as boolean | undefined}
            onChange={onChange}
            showKeyboardHints={showKeyboardHints}
            onSelectionComplete={onSelectionComplete}
          />
        )
      case 'slider':
        return (
          <SliderQuestion
            config={config as SliderQuestionConfig}
            value={value as number | undefined}
            onChange={onChange}
            showKeyboardHints={showKeyboardHints}
            onSelectionComplete={onSelectionComplete}
          />
        )
      case 'image_choice':
        return (
          <ImageChoiceQuestion
            config={config as ImageChoiceQuestionConfig}
            value={value}
            onChange={onChange}
            showKeyboardHints={showKeyboardHints}
            onSelectionComplete={onSelectionComplete}
          />
        )
      case 'semantic_differential':
        return (
          <SemanticDifferentialQuestion
            config={config as SemanticDifferentialQuestionConfig}
            value={value as SemanticDifferentialResponseValue | undefined}
            onChange={onChange}
            showKeyboardHints={showKeyboardHints}
            onSelectionComplete={onSelectionComplete}
          />
        )
      case 'constant_sum':
        return (
          <ConstantSumQuestion
            config={config as ConstantSumQuestionConfig}
            value={value as ConstantSumResponseValue | undefined}
            onChange={onChange}
            showKeyboardHints={showKeyboardHints}
          />
        )
      case 'audio_response':
        // Audio response requires recording context to be passed
        if (!recordingContext) {
          return (
            <p className="text-muted-foreground">
              Audio recording is not available in this context
            </p>
          )
        }
        return (
          <AudioResponseQuestion
            config={config as AudioResponseQuestionConfig}
            value={value as AudioResponseValue | undefined}
            onChange={onChange}
            studyId={recordingContext.studyId}
            participantId={recordingContext.participantId}
            sessionToken={recordingContext.sessionToken}
            showKeyboardHints={showKeyboardHints}
            onSelectionComplete={onSelectionComplete}
          />
        )
      default:
        return <p className="text-muted-foreground">Unknown question type</p>
    }
  }

  return (
    <div className="space-y-6">
      {/* Question image (if present) */}
      {question.image?.url && (
        <div className="relative w-full max-w-2xl mx-auto">
          <Image
            src={question.image.url}
            alt={question.image.alt || 'Question image'}
            width={800}
            height={400}
            className="rounded-lg object-contain w-full h-auto max-h-[300px]"
            priority
          />
        </div>
      )}

      {/* Question text with inline required indicator (supports answer piping) */}
      <div className="flex items-start gap-1">
        {resolvedHtml ? (
          <div
            className="max-w-none text-lg md:text-xl font-medium text-foreground
              [&_p]:text-lg [&_p]:md:text-xl [&_p]:leading-normal [&_p]:my-0
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
              [&_li]:text-foreground [&_li]:my-0.5"
            dangerouslySetInnerHTML={{ __html: resolvedHtml }}
          />
        ) : (
          <p className="text-lg md:text-xl font-medium text-foreground">{resolvedText}</p>
        )}
        {is_required && (
          <span className="text-destructive text-lg md:text-xl flex-shrink-0">*</span>
        )}
      </div>
      {/* Optional description/notes shown below question title (supports answer piping) */}
      {resolvedDescription && (
        <p className="text-base text-muted-foreground">{resolvedDescription}</p>
      )}
      {renderQuestion()}
    </div>
  )
}
