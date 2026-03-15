'use client'

import { useState, useEffect } from 'react'
import { Label } from '@veritio/ui'
import { Input } from '@veritio/ui'
import { Switch } from '@veritio/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@veritio/ui'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import type {
  StudyFlowQuestion,
  QuestionConfig,
  TextQuestionConfig,
  NPSQuestionConfig,
  MatrixQuestionConfig,
  RankingQuestionConfig,
  MultipleChoiceQuestionConfig,
  OpinionScaleQuestionConfig,
  YesNoQuestionConfig,
  SliderQuestionConfig,
  AudioResponseQuestionConfig,
} from '../../../../lib/supabase/study-flow-types'
import { TextConfig } from './type-configs/text-config'
import { NPSConfig } from './type-configs/nps-config'
import { MatrixConfig } from './type-configs/matrix-config'
import { RankingConfig } from './type-configs/ranking-config'
import { MultipleChoiceConfig } from './type-configs/multiple-choice-config'
import { OpinionScaleConfig } from './type-configs/opinion-scale-config'
import { YesNoConfig } from './type-configs/yes-no-config'
import { SliderConfig } from './type-configs/slider-config'
import { AudioResponseConfig } from './type-configs/audio-response-config'
import { QuestionImageUpload } from './question-image-upload'
import { DisplayLogicEditor } from './display-logic-editor'
import { BranchingLogicEditor } from './branching-logic-editor'

interface QuestionEditorProps {
  question: StudyFlowQuestion
  showBranchingLogic?: boolean
}

export function QuestionEditor({ question, showBranchingLogic = false }: QuestionEditorProps) {
  const { updateQuestion, studyId } = useStudyFlowBuilderStore()

  // Local state for blur-to-save pattern
  const [localQuestionText, setLocalQuestionText] = useState(question.question_text)

  // Sync local state when question changes (e.g., switching questions)
  useEffect(() => {
    setLocalQuestionText(question.question_text)
  }, [question.id, question.question_text])

  const handleUpdate = (updates: Partial<StudyFlowQuestion>) => {
    updateQuestion(question.id, updates)
  }

  const handleConfigUpdate = (configUpdates: Partial<QuestionConfig>) => {
    updateQuestion(question.id, {
      config: { ...question.config, ...configUpdates } as QuestionConfig,
    })
  }

  const renderConfigEditor = () => {
    switch (question.question_type) {
      case 'single_line_text':
      case 'multi_line_text':
        return (
          <TextConfig
            questionId={question.id}
            config={question.config as TextQuestionConfig}
            onChange={handleConfigUpdate}
            isMultiLine={question.question_type === 'multi_line_text'}
          />
        )
      case 'nps':
        return (
          <NPSConfig
            questionId={question.id}
            config={question.config as NPSQuestionConfig}
            onChange={handleConfigUpdate}
          />
        )
      case 'matrix':
        return (
          <MatrixConfig
            config={question.config as MatrixQuestionConfig}
            onChange={handleConfigUpdate}
          />
        )
      case 'ranking':
        return (
          <RankingConfig
            config={question.config as RankingQuestionConfig}
            onChange={handleConfigUpdate}
          />
        )
      case 'multiple_choice':
        return (
          <MultipleChoiceConfig
            questionId={question.id}
            config={question.config as MultipleChoiceQuestionConfig}
            onChange={handleConfigUpdate}
          />
        )
      case 'opinion_scale':
        return (
          <OpinionScaleConfig
            questionId={question.id}
            config={question.config as OpinionScaleQuestionConfig}
            onChange={handleConfigUpdate}
          />
        )
      case 'yes_no':
        return (
          <YesNoConfig
            questionId={question.id}
            config={question.config as YesNoQuestionConfig}
            onChange={handleConfigUpdate}
          />
        )
      case 'slider':
        return (
          <SliderConfig
            questionId={question.id}
            config={question.config as SliderQuestionConfig}
            onChange={handleConfigUpdate}
          />
        )
      case 'audio_response':
        return (
          <AudioResponseConfig
            config={question.config as AudioResponseQuestionConfig}
            onChange={handleConfigUpdate}
          />
        )
      default:
        return null
    }
  }

  return (
    <Tabs defaultValue="content" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="content">Content</TabsTrigger>
        <TabsTrigger value="options">Options</TabsTrigger>
        <TabsTrigger value="logic">Logic</TabsTrigger>
      </TabsList>

      <TabsContent value="content" className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label htmlFor={`q-${question.id}-text`}>Question Text</Label>
          <Input
            id={`q-${question.id}-text`}
            value={localQuestionText}
            onChange={(e) => setLocalQuestionText(e.target.value)}
            onBlur={() => {
              if (localQuestionText !== question.question_text) {
                handleUpdate({ question_text: localQuestionText })
              }
            }}
            placeholder="Enter your question..."
          />
        </div>

        {/* Question Image Upload */}
        {studyId && (
          <QuestionImageUpload
            studyId={studyId}
            questionId={question.id}
            image={question.image}
            onChange={(image) => handleUpdate({ image })}
          />
        )}

        {/* Type-specific configuration */}
        {renderConfigEditor()}
      </TabsContent>

      <TabsContent value="options" className="space-y-4 pt-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label htmlFor={`q-${question.id}-required`} className="font-medium">
              Required
            </Label>
            <p className="text-sm text-muted-foreground">
              Participants must answer this question
            </p>
          </div>
          <Switch
            id={`q-${question.id}-required`}
            checked={question.is_required}
            onCheckedChange={(checked) => handleUpdate({ is_required: checked })}
          />
        </div>
      </TabsContent>

      <TabsContent value="logic" className="space-y-4 pt-4">
        <DisplayLogicEditor
          question={question}
          onChange={(displayLogic) => handleUpdate({ display_logic: displayLogic })}
        />

        {showBranchingLogic && (
          <BranchingLogicEditor
            question={question}
            onChange={(logic) => handleUpdate({ branching_logic: logic })}
          />
        )}
      </TabsContent>
    </Tabs>
  )
}
