'use client'

import { useRef } from 'react'
import { Alert, AlertDescription, AlertTitle, Label, Switch, Textarea } from '@veritio/ui'
import { Lightbulb } from 'lucide-react'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import { getAvailableQuestionsForPiping } from '@veritio/prototype-test/lib/study-flow/answer-piping'
import type { StudyFlowQuestion, DisplayLogic, MultipleChoiceQuestionConfig, BranchingLogic } from '../../../../lib/supabase/study-flow-types'
import { DescriptionPipingInsert } from './description-piping-insert'
import { getDefaultQuestionConfig } from '../../../../lib/supabase/study-flow-types'
import { RichTextEditor } from '../rich-text-editor'
import { useRichTextRefine, type RefineSlots } from '../sections/rich-text-refine-context'
import { OptionsWithInlineLogicSection } from './options-with-inline-logic-section'
import { DisplayLogicEditor } from './display-logic-editor'
import { YesNoBranchingEditor } from './yes-no-branching-editor'
import { ScreeningTypeSwitcher, type SelectionMode, type ScreeningType } from './question-type-switcher'
import { SelectionModeToggle } from './selection-mode-toggle'

interface ScreeningQuestionEditorProps {
  question: StudyFlowQuestion
}
export function ScreeningQuestionEditor({ question }: ScreeningQuestionEditorProps) {
  const { updateQuestion, screeningQuestions } = useStudyFlowBuilderStore()
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const RefineWrapper = useRichTextRefine()

  const previousQuestions = screeningQuestions.filter(
    (q) => q.position < question.position && q.id !== question.id
  )
  const canUseDisplayLogic = previousQuestions.length > 0

  // Calculate available questions for piping (only earlier screening questions)
  const availableQuestionsForPiping = getAvailableQuestionsForPiping(
    question.position,
    screeningQuestions,
    question.section // Pass current section for accurate filtering
  )
  const handleUpdate = (updates: Partial<StudyFlowQuestion>) => {
    updateQuestion(question.id, updates)
  }
  const handleQuestionTextChange = (html: string) => {
    // Extract plain text for fallback display
    const plainText = html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim()

    handleUpdate({
      question_text: plainText,
      question_text_html: html,
    })
  }
  const handleDisplayLogicChange = (logic: DisplayLogic | null) => {
    handleUpdate({ display_logic: logic })
  }
  const handleBranchingLogicChange = (logic: BranchingLogic) => {
    handleUpdate({ branching_logic: logic })
  }
  const getYesNoBranchingLogic = (): BranchingLogic => {
    const bl = question.branching_logic as BranchingLogic | null | undefined
    if (bl) {
      return {
        rules: bl.rules || [],
        defaultTarget: bl.defaultTarget || 'next',
      }
    }
    // Default: continue to next question for both options
    return {
      rules: [],
      defaultTarget: 'next',
    }
  }
  const handleRequiredChange = (checked: boolean) => {
    handleUpdate({ is_required: checked })
  }
  const handleTypeChange = (newType: ScreeningType) => {
    if (newType === question.question_type) return

    handleUpdate({
      question_type: newType,
      config: getDefaultQuestionConfig(newType),
      // Reset branching logic when switching types
      branching_logic: null,
    })
  }
  const handleModeChange = (newMode: SelectionMode) => {
    const currentConfig = question.config as MultipleChoiceQuestionConfig
    if (newMode === currentConfig.mode) return

    handleUpdate({
      config: {
        ...currentConfig,
        mode: newMode,
      } as MultipleChoiceQuestionConfig,
    })
  }

  // Get current mode from config (default to 'single' for backwards compatibility)
  const currentMode: SelectionMode = (question.config as { mode?: SelectionMode })?.mode || 'single'

  return (
    <div className="space-y-6">
      {/* Section 1: Question Text with Type Switcher in header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Label className="text-base font-semibold">Question</Label>
            {/* Inline Required Toggle */}
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
          </div>
          {/* Type switcher - allows switching between Selection/Yes-No */}
          <ScreeningTypeSwitcher
            currentType={question.question_type as ScreeningType}
            onTypeChange={handleTypeChange}
          />
        </div>
        {RefineWrapper ? (
          <RefineWrapper>
            {({ trailingSlot, overlaySlot, onEditorCreated }) => (
              <RichTextEditor
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
          <RichTextEditor
            content={question.question_text_html || question.question_text || ''}
            onChange={handleQuestionTextChange}
            placeholder="Enter your question here..."
            minHeight="100px"
            enablePiping={availableQuestionsForPiping.length > 0}
            availableQuestions={availableQuestionsForPiping}
          />
        )}
        {/* Add notes - optional description shown to participants */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">Add notes</Label>
            {availableQuestionsForPiping.length > 0 && (
              <DescriptionPipingInsert
                textareaRef={descriptionRef}
                value={question.description || ''}
                onChange={(value) => handleUpdate({ description: value || null })}
                availableQuestions={availableQuestionsForPiping}
              />
            )}
          </div>
          <Textarea
            ref={descriptionRef}
            value={question.description || ''}
            onChange={(e) => handleUpdate({ description: e.target.value || null })}
            placeholder="Type extra details here. This is optional."
            rows={2}
            className="resize-none text-sm"
          />
        </div>
      </div>

      {/* Section 2: Options with Inline Logic (only for multiple_choice questions) */}
      {question.question_type === 'multiple_choice' && (
        <div className="space-y-5 border-t pt-6">
          {/* Mode Selector - Reusable component shared with Survey Questionnaire */}
          <SelectionModeToggle
            value={currentMode}
            onValueChange={handleModeChange}
          />

          <OptionsWithInlineLogicSection
            question={question}
            onUpdate={handleUpdate}
            hideTypeSwitcher
            allSectionQuestions={screeningQuestions}
          />
        </div>
      )}

      {/* For yes_no questions, show branching logic editor */}
      {question.question_type === 'yes_no' && (
        <div className="space-y-3 border-t pt-6">
          <Label className="text-sm font-medium">Branching Logic</Label>
          <p className="text-sm text-muted-foreground mb-4">
            Set what happens when participants select each option.
          </p>
          <YesNoBranchingEditor
            question={question}
            logic={getYesNoBranchingLogic()}
            onChange={handleBranchingLogicChange}
          />
        </div>
      )}

      {/* Section 3: Display Logic */}
      <div className="border-t pt-6">
        {!canUseDisplayLogic ? (
          <Alert className="bg-muted/30">
            <Lightbulb className="h-4 w-4" />
            <AlertTitle className="text-sm font-medium">
              Need a preceding question
            </AlertTitle>
            <AlertDescription className="text-sm text-muted-foreground">
              Add a Radio button, Dropdown, or Checkbox question before this
              one to enable display logic.
            </AlertDescription>
          </Alert>
        ) : (
          <DisplayLogicEditor
            question={question}
            onChange={handleDisplayLogicChange}
          />
        )}
      </div>
    </div>
  )
}
