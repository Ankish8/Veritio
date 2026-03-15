'use client'

import { Label } from '@veritio/ui/components/label'
import { RadioGroup, RadioGroupItem } from '@veritio/ui/components/radio-group'
import { Checkbox } from '@veritio/ui/components/checkbox'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import { QuestionTypeCards } from '../question-builder/question-type-cards'
import { PrePostQuestionEditor } from '../question-builder/pre-post-question-editor'
import { Settings2 } from 'lucide-react'
import type { QuestionType } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { getDefaultQuestionConfig } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { CollaborativeField } from './collaborative-field'

interface QuestionsSectionProps {
  section: 'pre_study' | 'post_study'
  studyId: string
}

export function QuestionsSection({ section, studyId }: QuestionsSectionProps) {
  const {
    flowSettings,
    updatePreStudySettings,
    updatePostStudySettings,
    preStudyQuestions,
    postStudyQuestions,
    selectedQuestionId,
    updateQuestion,
  } = useStudyFlowBuilderStore()

  const isPreStudy = section === 'pre_study'
  const settings = isPreStudy ? flowSettings.preStudyQuestions : flowSettings.postStudyQuestions
  const updateSettings = isPreStudy ? updatePreStudySettings : updatePostStudySettings
  const questions = isPreStudy ? preStudyQuestions : postStudyQuestions

  // Check if any questions have display logic (for settings warnings)
  const hasQuestionsWithLogic = questions.some((q) => q.display_logic)

  // Find the selected question
  const selectedQuestion = selectedQuestionId
    ? questions.find((q) => q.id === selectedQuestionId)
    : null

  // Check if this is a newly created question (needs type selection)
  const isNewQuestion = selectedQuestion?.question_text === '' &&
    selectedQuestion?.question_text_html === null

  // Handle type selection for new question
  const handleTypeSelect = (type: QuestionType) => {
    if (selectedQuestionId) {
      updateQuestion(selectedQuestionId, {
        question_type: type,
        question_text_html: '',
        config: getDefaultQuestionConfig(type),
      })
    }
  }

  const sectionLabel = isPreStudy ? 'Pre-Study' : 'Post-Study'

  // Show question type cards for newly created questions
  if (selectedQuestion && isNewQuestion) {
    return (
      <div className="space-y-6">
        <QuestionTypeCards
          onSelect={handleTypeSelect}
          title="Choose question type"
          description={`Select the type of ${sectionLabel.toLowerCase()} question you want to add.`}
        />
      </div>
    )
  }

  // Show question editor for existing questions with type already set
  if (selectedQuestion && !isNewQuestion) {
    return (
      <div className="space-y-6">
        <PrePostQuestionEditor question={selectedQuestion} />
      </div>
    )
  }

  // Show settings view when 'settings' is selected from sidebar
  if (selectedQuestionId === 'settings') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {sectionLabel} Questions Settings
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure {sectionLabel.toLowerCase()} section appearance and behavior
          </p>
        </div>

        {/* Introductory Message Section */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-1">Introductory Message</h4>
            <p className="text-xs text-muted-foreground">
              Shown to participants before they see the {sectionLabel.toLowerCase()} questions
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`${section}-intro-title`}>Title</Label>
              <CollaborativeField
                id={`${section}-intro-title`}
                fieldPath={`flow.${section}.introTitle`}
                value={settings.introTitle || ''}
                onChange={(value) => updateSettings({ introTitle: value || undefined })}
                placeholder={isPreStudy ? 'Before We Begin' : 'Almost Done'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${section}-intro-message`}>Message</Label>
              <CollaborativeField
                id={`${section}-intro-message`}
                fieldPath={`flow.${section}.introMessage`}
                value={settings.introMessage || ''}
                onChange={(value) => updateSettings({ introMessage: value || undefined })}
                placeholder={
                  isPreStudy
                    ? 'A few quick questions about your expectations and habits.'
                    : 'Just a couple more questions about your overall experience.'
                }
              />
              <p className="text-xs text-muted-foreground">
                A brief description to set context for participants
              </p>
            </div>
          </div>
        </div>

        {/* Question Display Settings */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-1">Question Display</h4>
            <p className="text-xs text-muted-foreground">
              How questions are presented to participants
            </p>
          </div>

          <RadioGroup
            value={settings.pageMode || 'one_per_page'}
            onValueChange={(value) =>
              updateSettings({ pageMode: value as 'one_per_page' | 'all_on_one' })
            }
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="one_per_page" id={`${section}-one-per-page`} />
              <Label htmlFor={`${section}-one-per-page`} className="text-sm font-normal cursor-pointer">
                One question per page
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all_on_one" id={`${section}-all-on-one`} />
              <Label htmlFor={`${section}-all-on-one`} className="text-sm font-normal cursor-pointer">
                All questions on one page
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Randomization */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-1">Question Order</h4>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id={`${section}-randomize`}
              checked={settings.randomizeQuestions || false}
              onCheckedChange={(checked) => {
                if (!hasQuestionsWithLogic) {
                  updateSettings({ randomizeQuestions: checked === true })
                }
              }}
              disabled={hasQuestionsWithLogic}
            />
            <div className="space-y-0.5">
              <Label
                htmlFor={`${section}-randomize`}
                className={`text-sm font-normal cursor-pointer ${hasQuestionsWithLogic ? 'opacity-50' : ''}`}
              >
                Randomize question order
              </Label>
              <p className="text-xs text-muted-foreground">
                Show questions in random order for each participant
              </p>
            </div>
          </div>
          {hasQuestionsWithLogic && (
            <p className="text-xs text-amber-600">
              Randomization is disabled because some questions have display logic
            </p>
          )}
        </div>
      </div>
    )
  }

  // Default: Show section overview (no question selected)
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-medium">{sectionLabel} Questions</h4>
          <p className="text-sm text-muted-foreground">
            {questions.length === 0
              ? isPreStudy
                ? 'Collect demographic or contextual information before the activity.'
                : 'Gather feedback and additional insights after the activity.'
              : `${questions.length} question${questions.length === 1 ? '' : 's'} configured. Select a question in the sidebar to edit.`}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Click the settings icon in the sidebar header to configure introductory message and display options.
      </p>
    </div>
  )
}
