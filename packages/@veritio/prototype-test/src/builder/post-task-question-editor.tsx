'use client'
import {
  Label,
  Textarea,
  Switch,
} from '@veritio/ui'
import type {
  PostTaskQuestion,
  QuestionConfig,
  TextQuestionConfig,
  NPSQuestionConfig,
  MatrixQuestionConfig,
  RankingQuestionConfig,
  MultipleChoiceQuestionConfig,
  OpinionScaleQuestionConfig,
  YesNoQuestionConfig,
  ImageChoiceQuestionConfig,
  SliderQuestionConfig,
  SemanticDifferentialQuestionConfig,
  ConstantSumQuestionConfig,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'

// Import type-specific config components
import { TextConfig } from '../components/study-flow/builder/question-builder/type-configs/text-config'
import { NPSConfig } from '../components/study-flow/builder/question-builder/type-configs/nps-config'
import { MatrixConfig } from '../components/study-flow/builder/question-builder/type-configs/matrix-config'
import { RankingConfig } from '../components/study-flow/builder/question-builder/type-configs/ranking-config'
import { MultipleChoiceConfig } from '../components/study-flow/builder/question-builder/type-configs/multiple-choice-config'
import { OpinionScaleConfig } from '../components/study-flow/builder/question-builder/type-configs/opinion-scale-config'
import { YesNoConfig } from '../components/study-flow/builder/question-builder/type-configs/yes-no-config'
import { ImageChoiceConfig } from '../components/study-flow/builder/question-builder/type-configs/image-choice-config'
import { SliderConfig } from '../components/study-flow/builder/question-builder/type-configs/slider-config'
import { SemanticDifferentialConfig } from '../components/study-flow/builder/question-builder/type-configs/semantic-differential-config'
import { ConstantSumConfig } from '../components/study-flow/builder/question-builder/type-configs/constant-sum-config'
import { PostTaskQuestionDisplayLogicEditor } from './shared/post-task-question-display-logic-editor'

interface PostTaskQuestionEditorProps {
  question: PostTaskQuestion
  studyId: string
  onUpdate: (updates: Partial<PostTaskQuestion>) => void
  previousQuestions?: PostTaskQuestion[]
}

export function PostTaskQuestionEditor({
  question,
  studyId,
  onUpdate,
  previousQuestions = [],
}: PostTaskQuestionEditorProps) {
  const handleConfigChange = (configUpdates: Partial<QuestionConfig>) => {
    const currentConfig = question.config as QuestionConfig
    onUpdate({ config: { ...currentConfig, ...configUpdates } as PostTaskQuestion['config'] })
  }

  const renderTypeConfig = () => {
    switch (question.question_type) {
      case 'single_line_text':
      case 'multi_line_text':
        return (
          <TextConfig
            questionId={question.id}
            config={question.config as TextQuestionConfig}
            onChange={handleConfigChange}
            isMultiLine={question.question_type === 'multi_line_text'}
          />
        )
      case 'multiple_choice':
        return (
          <MultipleChoiceConfig
            config={question.config as MultipleChoiceQuestionConfig}
            onChange={handleConfigChange}
          />
        )
      case 'yes_no':
        return (
          <YesNoConfig
            config={question.config as YesNoQuestionConfig}
            onChange={handleConfigChange}
          />
        )
      case 'opinion_scale':
        return (
          <OpinionScaleConfig
            config={question.config as OpinionScaleQuestionConfig}
            onChange={handleConfigChange}
          />
        )
      case 'nps':
        return (
          <NPSConfig
            questionId={question.id}
            config={question.config as NPSQuestionConfig}
            onChange={handleConfigChange}
          />
        )
      case 'matrix':
        return (
          <MatrixConfig
            config={question.config as MatrixQuestionConfig}
            onChange={handleConfigChange}
          />
        )
      case 'ranking':
        return (
          <RankingConfig
            config={question.config as RankingQuestionConfig}
            onChange={handleConfigChange}
          />
        )
      case 'image_choice':
        return (
          <ImageChoiceConfig
            config={question.config as ImageChoiceQuestionConfig}
            onChange={handleConfigChange}
            studyId={studyId}
            questionId={question.id}
          />
        )
      case 'slider':
        return (
          <SliderConfig
            config={question.config as SliderQuestionConfig}
            onChange={handleConfigChange}
          />
        )
      case 'semantic_differential':
        return (
          <SemanticDifferentialConfig
            config={question.config as SemanticDifferentialQuestionConfig}
            onChange={handleConfigChange}
          />
        )
      case 'constant_sum':
        return (
          <ConstantSumConfig
            config={question.config as ConstantSumQuestionConfig}
            onChange={handleConfigChange}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6 h-full overflow-y-auto pr-2">
      {/* Question Text */}
      <div className="space-y-2">
        <Label htmlFor="question-text">Question</Label>
        <Textarea
          id="question-text"
          value={question.question_text}
          onChange={(e) => onUpdate({ question_text: e.target.value })}
          placeholder="Enter your question here"
          rows={3}
        />
      </div>

      {/* Required Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="required">Required</Label>
          <p className="text-xs text-muted-foreground">
            Participants must answer this question
          </p>
        </div>
        <Switch
          id="required"
          checked={question.is_required}
          onCheckedChange={(checked) => onUpdate({ is_required: checked })}
        />
      </div>

      {/* Type-specific configuration */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-medium mb-4">Configuration</h4>
        {renderTypeConfig()}
      </div>

      {/* Display Logic - always shown (can reference task result even for first question) */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-medium mb-4">Display Logic</h4>
        <PostTaskQuestionDisplayLogicEditor
          question={question}
          previousQuestions={previousQuestions}
          onChange={(logic) => onUpdate({ display_logic: logic })}
        />
      </div>
    </div>
  )
}
