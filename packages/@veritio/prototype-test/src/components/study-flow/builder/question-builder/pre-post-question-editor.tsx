'use client'

import { useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Input, Label, Switch } from '@veritio/ui'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import { useSurveySections } from '@veritio/prototype-test/hooks'
import { useABTestEditor } from './hooks'
import {
  ABTestHeaderControls,
  ABTestVariantEditors,
  ABTestDescriptionSection,
} from './ab-test-editor'
import type {
  StudyFlowQuestion,
  DisplayLogic,
  SurveyBranchingLogic,
  ChoiceOption,
  OpinionScaleQuestionConfig,
  YesNoQuestionConfig,
  MultipleChoiceQuestionConfig,
  MultipleChoiceMode,
  SliderQuestionConfig,
  ImageChoiceQuestionConfig,
  SemanticDifferentialQuestionConfig,
  ConstantSumQuestionConfig,
  EnhancedSurveyBranchingLogic,
} from '../../../../lib/supabase/study-flow-types'
import type { SurveyCustomSection } from '../../../../lib/supabase/rules-types'
import { RichTextEditor } from '../rich-text-editor'
import { SmartEditor } from '../../../yjs'
import { useRichTextRefine, type RefineSlots } from '../sections/rich-text-refine-context'
import { OptionsWithoutLogicSection } from './options-without-logic-section'
import { DisplayLogicEditor } from './display-logic-editor'
import { OpinionScaleConfig, YesNoConfig, SelectionLimitsConfig, MultipleChoiceTogglesConfig, SliderConfig, ImageChoiceConfig, SemanticDifferentialConfig, ConstantSumConfig } from './type-configs'
import { ABTestOptionsConfig } from './ab-test-options-config'
import { SurveyOptionsWithLogic, EnhancedBranchingEditor } from '../inline-logic'
import { SelectionModeToggle } from './selection-mode-toggle'
import { getAvailableQuestionsForPiping } from '@veritio/prototype-test/lib/study-flow/answer-piping'
import {
  TextQuestionSection,
  NPSQuestionSection,
  MatrixQuestionSection,
  RankingQuestionSection,
} from './question-sections'

interface PrePostQuestionEditorProps {
  question: StudyFlowQuestion
}
export function PrePostQuestionEditor({ question }: PrePostQuestionEditorProps) {
  const { updateQuestion, preStudyQuestions, postStudyQuestions, surveyQuestions, screeningQuestions } = useStudyFlowBuilderStore()
  const params = useParams()
  const studyId = params.studyId as string | undefined
  const { sections: customSections } = useSurveySections(studyId ?? null)

  // AI inline refine wrapper for rich text editors (provided by context from app level)
  const RefineWrapper = useRichTextRefine()

  // A/B Test functionality
  const abTest = useABTestEditor(question)

  // Determine which section this question belongs to
  const isInSurvey = surveyQuestions.some((q) => q.id === question.id)
  const isInPostStudy = postStudyQuestions.some((q) => q.id === question.id)

  // Get questions from the same section for display logic
  const sectionQuestions = isInSurvey
    ? surveyQuestions
    : isInPostStudy
      ? postStudyQuestions
      : preStudyQuestions

  // All questions for branch targets
  const allQuestions = useMemo(
    () => [...screeningQuestions, ...preStudyQuestions, ...surveyQuestions, ...postStudyQuestions],
    [screeningQuestions, preStudyQuestions, surveyQuestions, postStudyQuestions]
  )

  // PERFORMANCE: Memoize piping calculation
  const availableQuestionsForPiping = useMemo(
    () => getAvailableQuestionsForPiping(question.position, allQuestions, question.section),
    [question.position, question.section, allQuestions]
  )

  const previousQuestions = sectionQuestions.filter(
    (q) => q.position < question.position && q.id !== question.id
  )
  const canUseDisplayLogic = previousQuestions.length > 0

  const handleUpdate = useCallback(
    (updates: Partial<StudyFlowQuestion>) => {
      updateQuestion(question.id, updates)
    },
    [updateQuestion, question.id]
  )

  const handleQuestionTextChange = useCallback(
    (html: string) => {
      const plainText = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
      handleUpdate({ question_text: plainText, question_text_html: html })
    },
    [handleUpdate]
  )

  const handleRequiredChange = useCallback(
    (checked: boolean) => handleUpdate({ is_required: checked }),
    [handleUpdate]
  )

  const handleDisplayLogicChange = useCallback(
    (logic: DisplayLogic | null) => handleUpdate({ display_logic: logic }),
    [handleUpdate]
  )

  const isChoiceType = question.question_type === 'multiple_choice'

  return (
    <div className="space-y-6">
      {/* Section 1: Question Text */}
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <Label className="text-base font-semibold">Question</Label>
          <div className="flex items-center gap-2">
            <Switch
              id="required-inline"
              checked={question.is_required ?? true}
              onCheckedChange={handleRequiredChange}
              className="scale-90"
            />
            <Label htmlFor="required-inline" className="text-sm text-muted-foreground cursor-pointer">
              Required
            </Label>
          </div>
          {isInSurvey && (
            <ABTestHeaderControls
              isEnabled={abTest.isEnabled}
              isLoading={abTest.isToggleDisabled}
              onToggle={abTest.handleToggle}
              isChoiceType={isChoiceType}
              includeDescription={abTest.includeDescription}
              includeOptions={abTest.includeOptions}
              onIncludeDescriptionToggle={abTest.handleIncludeDescriptionToggle}
              onIncludeOptionsToggle={abTest.handleIncludeOptionsToggle}
              splitValue={abTest.localSplitValue}
              onSplitValueChange={abTest.setLocalSplitValue}
              onSplitCommit={abTest.handleSplitChange}
            />
          )}
        </div>

        {abTest.isEnabled ? (
          <ABTestVariantEditors
            questionId={question.id}
            studyId={question.study_id}
            variantAContent={abTest.variantAContent}
            variantBContent={abTest.variantBContent}
            onVariantATextChange={abTest.handleVariantATextChange}
            onVariantBTextChange={abTest.handleVariantBTextChange}
            enablePiping={availableQuestionsForPiping.length > 0}
            availableQuestions={availableQuestionsForPiping}
            fallbackContent={question.question_text_html || question.question_text || ''}
          />
        ) : RefineWrapper ? (
          <RefineWrapper>
            {({ trailingSlot, overlaySlot, onEditorCreated }) => (
              <SmartEditor
                fieldPath={`question.${question.id}.text`}
                studyId={question.study_id}
                content={question.question_text_html || question.question_text || ''}
                onChange={handleQuestionTextChange}
                placeholder="Enter your question here..."
                minHeight="100px"
                enablePiping={availableQuestionsForPiping.length > 0}
                availableQuestions={availableQuestionsForPiping}
                trailingSlot={trailingSlot}
                overlaySlot={overlaySlot}
                onEditorCreated={onEditorCreated}
              />
            )}
          </RefineWrapper>
        ) : (
          <SmartEditor
            fieldPath={`question.${question.id}.text`}
            studyId={question.study_id}
            content={question.question_text_html || question.question_text || ''}
            onChange={handleQuestionTextChange}
            placeholder="Enter your question here..."
            minHeight="100px"
            enablePiping={availableQuestionsForPiping.length > 0}
            availableQuestions={availableQuestionsForPiping}
          />
        )}

        <ABTestDescriptionSection
          questionId={question.id}
          isEnabled={abTest.isEnabled}
          includeDescription={abTest.includeDescription}
          variantAContent={abTest.variantAContent}
          variantBContent={abTest.variantBContent}
          onVariantADescriptionChange={abTest.handleVariantADescriptionChange}
          onVariantBDescriptionChange={abTest.handleVariantBDescriptionChange}
          description={question.description ?? null}
          onDescriptionChange={(value) => handleUpdate({ description: value })}
          availableQuestions={availableQuestionsForPiping}
        />
      </div>

      {/* Section 2: Type-Specific Configuration */}
      <div className="space-y-4 border-t pt-6">
        {isChoiceType && (
          isInSurvey ? (
            <SurveyChoiceSection
              question={question}
              onUpdate={handleUpdate}
              allQuestions={allQuestions}
              customSections={customSections}
              abTest={abTest}
            />
          ) : (
            <OptionsWithoutLogicSection question={question} onUpdate={handleUpdate} />
          )
        )}

        {(question.question_type === 'single_line_text' || question.question_type === 'multi_line_text') && (
          <TextQuestionSection
            questionId={question.id}
            question={question}
            onUpdate={handleUpdate}
            isInSurvey={isInSurvey}
            allQuestions={allQuestions}
            customSections={customSections}
          />
        )}

        {question.question_type === 'nps' && (
          <NPSQuestionSection
            questionId={question.id}
            question={question}
            onUpdate={handleUpdate}
            isInSurvey={isInSurvey}
            allQuestions={allQuestions}
            customSections={customSections}
          />
        )}

        {question.question_type === 'matrix' && (
          <MatrixQuestionSection
            question={question}
            onUpdate={handleUpdate}
            isInSurvey={isInSurvey}
            allQuestions={allQuestions}
            customSections={customSections}
          />
        )}

        {question.question_type === 'ranking' && (
          <RankingQuestionSection
            question={question}
            onUpdate={handleUpdate}
            isInSurvey={isInSurvey}
            allQuestions={allQuestions}
            customSections={customSections}
          />
        )}

        {question.question_type === 'opinion_scale' && (
          <OpinionScaleConfig
            questionId={question.id}
            config={question.config as OpinionScaleQuestionConfig}
            onChange={(configUpdates) => {
              handleUpdate({ config: { ...question.config, ...configUpdates } as OpinionScaleQuestionConfig })
            }}
          />
        )}

        {question.question_type === 'yes_no' && (
          <YesNoConfig
            questionId={question.id}
            config={question.config as YesNoQuestionConfig}
            onChange={(configUpdates) => {
              handleUpdate({ config: { ...question.config, ...configUpdates } as YesNoQuestionConfig })
            }}
          />
        )}

        {question.question_type === 'slider' && (
          <SliderConfig
            questionId={question.id}
            config={question.config as SliderQuestionConfig}
            onChange={(configUpdates) => {
              handleUpdate({ config: { ...question.config, ...configUpdates } as SliderQuestionConfig })
            }}
          />
        )}

        {question.question_type === 'image_choice' && studyId && (
          <ImageChoiceConfig
            config={question.config as ImageChoiceQuestionConfig}
            onChange={(configUpdates) => {
              handleUpdate({ config: { ...question.config, ...configUpdates } as ImageChoiceQuestionConfig })
            }}
            studyId={studyId}
            questionId={question.id}
          />
        )}

        {question.question_type === 'semantic_differential' && (
          <div className="space-y-4">
            <SemanticDifferentialConfig
              config={question.config as SemanticDifferentialQuestionConfig}
              onChange={(configUpdates) => {
                handleUpdate({ config: { ...question.config, ...configUpdates } as SemanticDifferentialQuestionConfig })
              }}
            />
            {isInSurvey && (
              <EnhancedBranchingEditor
                question={question}
                branchingLogic={question.survey_branching_logic as EnhancedSurveyBranchingLogic | null}
                onBranchingLogicChange={(logic) => handleUpdate({ survey_branching_logic: logic })}
                allQuestions={allQuestions}
                customSections={customSections}
                currentQuestionId={question.id}
                currentSectionId={question.custom_section_id}
                currentQuestionPosition={question.position}
                flowSection={question.section}
              />
            )}
          </div>
        )}

        {question.question_type === 'constant_sum' && (
          <div className="space-y-4">
            <ConstantSumConfig
              config={question.config as ConstantSumQuestionConfig}
              onChange={(configUpdates) => {
                handleUpdate({ config: { ...question.config, ...configUpdates } as ConstantSumQuestionConfig })
              }}
            />
            {isInSurvey && (
              <EnhancedBranchingEditor
                question={question}
                branchingLogic={question.survey_branching_logic as EnhancedSurveyBranchingLogic | null}
                onBranchingLogicChange={(logic) => handleUpdate({ survey_branching_logic: logic })}
                allQuestions={allQuestions}
                customSections={customSections}
                currentQuestionId={question.id}
                currentSectionId={question.custom_section_id}
                currentQuestionPosition={question.position}
                flowSection={question.section}
              />
            )}
          </div>
        )}
      </div>

      {/* Section 3: Display Logic */}
      {canUseDisplayLogic && (
        <div className="border-t pt-6">
          <DisplayLogicEditor question={question} onChange={handleDisplayLogicChange} />
        </div>
      )}
    </div>
  )
}
function SurveyChoiceSection({
  question,
  onUpdate,
  allQuestions,
  customSections,
  abTest,
}: {
  question: StudyFlowQuestion
  onUpdate: (updates: Partial<StudyFlowQuestion>) => void
  allQuestions: StudyFlowQuestion[]
  customSections: SurveyCustomSection[]
  abTest: ReturnType<typeof useABTestEditor>
}) {
  const config = question.config as MultipleChoiceQuestionConfig
  const options = config.options || []
  const mode = config.mode || 'single'

  const handleOptionsChange = useCallback(
    (newOptions: ChoiceOption[]) => {
      onUpdate({ config: { ...config, options: newOptions } })
    },
    [config, onUpdate]
  )

  const handleBranchingLogicChange = useCallback(
    (logic: SurveyBranchingLogic | null) => {
      onUpdate({ survey_branching_logic: logic })
    },
    [onUpdate]
  )

  const handleModeChange = useCallback(
    (newMode: string) => {
      if (newMode) {
        onUpdate({ config: { ...config, mode: newMode as MultipleChoiceMode } })
      }
    },
    [config, onUpdate]
  )

  const handleConfigChange = useCallback(
    (updates: Partial<MultipleChoiceQuestionConfig>) => {
      onUpdate({ config: { ...config, ...updates } })
    },
    [config, onUpdate]
  )

  const handleBranchingToggle = useCallback(
    (enabled: boolean) => {
      handleBranchingLogicChange(enabled ? { rules: [], defaultTarget: 'continue' } : null)
    },
    [handleBranchingLogicChange]
  )

  const handleScoringToggle = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        handleOptionsChange(options.map((opt) => ({ ...opt, score: opt.score ?? 0 })))
      } else {
        handleOptionsChange(options.map(({ score, ...rest }) => rest))
      }
    },
    [options, handleOptionsChange]
  )

  return (
    <div className="space-y-5">
      <SelectionModeToggle value={mode} onValueChange={handleModeChange} />

      {!abTest.includeOptions && (
        <MultipleChoiceTogglesConfig
          config={config}
          options={options}
          hasBranchingLogic={!!question.survey_branching_logic}
          onConfigChange={handleConfigChange}
          onBranchingToggle={handleBranchingToggle}
          onScoringToggle={handleScoringToggle}
        />
      )}

      {config.allowOther && (
        <div className="space-y-2">
          <Label htmlFor="other-label" className="text-sm text-muted-foreground">
            &apos;Other&apos; label
          </Label>
          <Input
            id="other-label"
            value={config.otherLabel || ''}
            onChange={(e) => handleConfigChange({ otherLabel: e.target.value || undefined })}
            placeholder="Other (please specify)"
            className="max-w-xs"
          />
        </div>
      )}

      {mode === 'dropdown' && (
        <div className="space-y-2">
          <Label htmlFor="dropdown-placeholder" className="text-sm text-muted-foreground">
            Placeholder text
          </Label>
          <Input
            id="dropdown-placeholder"
            value={config.placeholder || ''}
            onChange={(e) => handleConfigChange({ placeholder: e.target.value || undefined })}
            placeholder="Select an option..."
            className="max-w-xs"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-sm font-medium">Options</Label>
        {abTest.includeOptions && abTest.variantAContent.options && abTest.variantBContent.options ? (
          <ABTestOptionsConfig
            variantAOptions={abTest.variantAContent.options}
            variantBOptions={abTest.variantBContent.options}
            onVariantAOptionsChange={abTest.handleVariantAOptionsChange}
            onVariantBOptionsChange={abTest.handleVariantBOptionsChange}
            variantABranchingLogic={abTest.variantAContent.survey_branching_logic}
            variantBBranchingLogic={abTest.variantBContent.survey_branching_logic}
            onVariantABranchingLogicChange={abTest.handleVariantABranchingLogicChange}
            onVariantBBranchingLogicChange={abTest.handleVariantBBranchingLogicChange}
            variantAShuffle={abTest.variantAContent.shuffle}
            variantBShuffle={abTest.variantBContent.shuffle}
            onVariantAShuffleChange={abTest.handleVariantAShuffleChange}
            onVariantBShuffleChange={abTest.handleVariantBShuffleChange}
            variantAAllowOther={abTest.variantAContent.allowOther}
            variantBAllowOther={abTest.variantBContent.allowOther}
            onVariantAAllowOtherChange={abTest.handleVariantAAllowOtherChange}
            onVariantBAllowOtherChange={abTest.handleVariantBAllowOtherChange}
            variantAOtherLabel={abTest.variantAContent.otherLabel}
            variantBOtherLabel={abTest.variantBContent.otherLabel}
            onVariantAOtherLabelChange={abTest.handleVariantAOtherLabelChange}
            onVariantBOtherLabelChange={abTest.handleVariantBOtherLabelChange}
            allQuestions={allQuestions}
            customSections={customSections}
            currentQuestionId={question.id}
            currentSectionId={question.custom_section_id}
            currentQuestionPosition={question.position}
            flowSection={question.section}
          />
        ) : (
          <SurveyOptionsWithLogic
            options={options}
            surveyBranchingLogic={question.survey_branching_logic as SurveyBranchingLogic | null | undefined}
            onOptionsChange={handleOptionsChange}
            onBranchingLogicChange={handleBranchingLogicChange}
            allQuestions={allQuestions}
            customSections={customSections}
            currentQuestionId={question.id}
            currentSectionId={question.custom_section_id}
            currentQuestionPosition={question.position}
            flowSection={question.section}
            supportsBranching={true}
            hideToggles={true}
          />
        )}
      </div>

      {mode === 'multi' && (
        <SelectionLimitsConfig
          minSelections={config.minSelections}
          maxSelections={config.maxSelections}
          maxOptions={options.length}
          onChange={handleConfigChange}
        />
      )}
    </div>
  )
}
