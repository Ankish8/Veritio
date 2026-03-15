'use client'

import type { PostTaskQuestion } from '@veritio/study-types'
import type {
  ResponseValue,
  OpinionScaleQuestionConfig,
  NPSQuestionConfig,
  YesNoQuestionConfig,
  MultipleChoiceQuestionConfig,
  TextQuestionConfig,
  MatrixQuestionConfig,
  RankingQuestionConfig,
  SliderQuestionConfig,
  ImageChoiceQuestionConfig,
  SemanticDifferentialQuestionConfig,
  SemanticDifferentialResponseValue,
  ConstantSumQuestionConfig,
  ConstantSumResponseValue,
} from '@veritio/study-types/study-flow-types'

// Import reusable question renderer components
import { OpinionScaleQuestion } from '@/components/study-flow/player/question-renderers/opinion-scale-question'
import { NPSRenderer } from '@/components/study-flow/player/question-renderers/nps-question'
import { YesNoQuestion } from '@/components/study-flow/player/question-renderers/yes-no-question'
import { MultipleChoiceQuestion } from '@/components/study-flow/player/question-renderers/multiple-choice-question'
import { SingleLineTextRenderer } from '@/components/study-flow/player/question-renderers/single-line-text'
import { MultiLineTextRenderer } from '@/components/study-flow/player/question-renderers/multi-line-text'
import { MatrixRenderer } from '@/components/study-flow/player/question-renderers/matrix-question'
import { SliderQuestion } from '@/components/study-flow/player/question-renderers/slider-question'
import { ImageChoiceQuestion } from '@/components/study-flow/player/question-renderers/image-choice-question'
import { SemanticDifferentialQuestion } from '@/components/study-flow/player/question-renderers/semantic-differential-question'
import { ConstantSumQuestion } from '@/components/study-flow/player/question-renderers/constant-sum-question'
import dynamic from 'next/dynamic'

// Dynamically import RankingRenderer to avoid bundling @dnd-kit for post-task questions that don't use ranking
const RankingRenderer = dynamic(
  () => import('@/components/study-flow/player/question-renderers/ranking-question').then(mod => ({ default: mod.RankingRenderer })),
  { ssr: false }
)

export function QuestionRenderer({
  question,
  value,
  onChange,
  onSelectionComplete,
  onEnterPress,
  onTextFocusChange,
  showKeyboardHints,
}: {
  question: PostTaskQuestion
  value: ResponseValue | undefined
  onChange: (value: ResponseValue) => void
  onSelectionComplete?: () => void
  onEnterPress?: () => void
  onTextFocusChange?: (focused: boolean) => void
  showKeyboardHints?: boolean
}) {
  // Cast to string to support legacy types ('text', 'rating')
  const questionType = (question.question_type || question.type) as string
  const config = question.config || {}

  switch (questionType) {
    case 'single_line_text':
      return (
        <SingleLineTextRenderer
          config={config as TextQuestionConfig}
          value={value as string | undefined}
          onChange={onChange}
          onEnterPress={onEnterPress}
          onFocusChange={onTextFocusChange}
        />
      )

    case 'multi_line_text':
    case 'text':
      return (
        <MultiLineTextRenderer
          config={config as TextQuestionConfig}
          value={value as string | undefined}
          onChange={onChange}
          onFocusChange={onTextFocusChange}
        />
      )

    case 'yes_no':
      return (
        <YesNoQuestion
          config={config as YesNoQuestionConfig}
          value={value as boolean | undefined}
          onChange={(v) => onChange(v)}
          onSelectionComplete={onSelectionComplete}
          showKeyboardHints={showKeyboardHints}
        />
      )

    case 'multiple_choice':
    case 'single_choice':
      return (
        <MultipleChoiceQuestion
          config={config as MultipleChoiceQuestionConfig}
          value={value}
          onChange={onChange}
          onSelectionComplete={onSelectionComplete}
          showKeyboardHints={showKeyboardHints}
        />
      )

    case 'opinion_scale':
      return (
        <OpinionScaleQuestion
          config={config as OpinionScaleQuestionConfig}
          value={value as number | undefined}
          onChange={(v) => onChange(v)}
          onSelectionComplete={onSelectionComplete}
          showKeyboardHints={showKeyboardHints}
        />
      )

    case 'nps':
      return (
        <NPSRenderer
          config={config as NPSQuestionConfig}
          value={value}
          onChange={onChange}
          onSelectionComplete={onSelectionComplete}
          showKeyboardHints={showKeyboardHints}
        />
      )

    case 'rating':
      // Rating is a subset of opinion_scale with numerical display
      return (
        <OpinionScaleQuestion
          config={{
            scalePoints: (config as any).maxRating || 5,
            scaleType: 'numerical',
          } as OpinionScaleQuestionConfig}
          value={value as number | undefined}
          onChange={(v) => onChange(v)}
          onSelectionComplete={onSelectionComplete}
          showKeyboardHints={showKeyboardHints}
        />
      )

    case 'matrix':
      return (
        <MatrixRenderer
          config={config as MatrixQuestionConfig}
          value={value}
          onChange={onChange}
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

    case 'slider':
      return (
        <SliderQuestion
          config={config as SliderQuestionConfig}
          value={value as number | undefined}
          onChange={(v) => onChange(v)}
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
          onChange={(v) => onChange(v)}
          showKeyboardHints={showKeyboardHints}
          onSelectionComplete={onSelectionComplete}
        />
      )

    case 'constant_sum':
      return (
        <ConstantSumQuestion
          config={config as ConstantSumQuestionConfig}
          value={value as ConstantSumResponseValue | undefined}
          onChange={(v) => onChange(v)}
          showKeyboardHints={showKeyboardHints}
        />
      )

    default:
      return (
        <MultiLineTextRenderer
          config={{} as TextQuestionConfig}
          value={value as string | undefined}
          onChange={onChange}
          onFocusChange={onTextFocusChange}
        />
      )
  }
}
