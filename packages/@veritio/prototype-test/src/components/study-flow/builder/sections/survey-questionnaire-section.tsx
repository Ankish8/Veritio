'use client'

import { Label } from '@veritio/ui/components/label'
import { Switch } from '@veritio/ui/components/switch'
import { RadioGroup, RadioGroupItem } from '@veritio/ui/components/radio-group'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import { useSurveySectionsUIStore } from '@/stores/survey-sections-ui-store'
import { QuestionTypeCards } from '../question-builder/question-type-cards'
import { PrePostQuestionEditor } from '../question-builder/pre-post-question-editor'
import { VariablesPanel } from '../rules'
import { SectionsPanel } from '../survey-sections'
import { ClipboardList, Settings2 } from 'lucide-react'
import type { QuestionType } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { getDefaultQuestionConfig } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { CollaborativeField } from './collaborative-field'

interface SurveyQuestionnaireSectionProps {
  studyId: string
}

export function SurveyQuestionnaireSection({ studyId }: SurveyQuestionnaireSectionProps) {
  const {
    flowSettings,
    updateSurveyQuestionnaireSettings,
    surveyQuestions,
    screeningQuestions,
    preStudyQuestions,
    postStudyQuestions,
    selectedQuestionId,
    updateQuestion,
  } = useStudyFlowBuilderStore()

  // UI state only - data is loaded by SectionsPanel via useSurveySections hook
  const { selectedSectionId, setSelectedSectionId } = useSurveySectionsUIStore()

  // Combine all questions for rule condition references
  const allQuestions = [...screeningQuestions, ...preStudyQuestions, ...surveyQuestions, ...postStudyQuestions]

  const settings = flowSettings.surveyQuestionnaire || {
    enabled: true,
    showIntro: true,
    introTitle: 'Survey',
    introMessage: 'Please answer the following questions.',
    pageMode: 'one_per_page',
    randomizeQuestions: false,
    showProgressBar: true,
    allowSkipQuestions: false,
  }

  // Find the selected question
  const selectedQuestion = selectedQuestionId
    ? surveyQuestions.find((q) => q.id === selectedQuestionId)
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

  // Show question type cards for newly created questions
  if (selectedQuestion && isNewQuestion) {
    return (
      <div className="space-y-6">
        <QuestionTypeCards
          onSelect={handleTypeSelect}
          title="Choose question type"
          description="Select the type of survey question you want to add."
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

  // Show intro message editor when 'intro' is selected
  if (selectedQuestionId === 'intro') {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Survey Introduction</h3>
            <p className="text-sm text-muted-foreground mt-1">
              This message is shown to participants before they begin the survey.
            </p>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="survey-intro-enabled">Show introduction</Label>
              <Switch
                id="survey-intro-enabled"
                checked={settings.showIntro !== false}
                onCheckedChange={(checked) => updateSurveyQuestionnaireSettings({ showIntro: checked })}
              />
            </div>

            {settings.showIntro !== false && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="survey-intro-title">Title</Label>
                  <CollaborativeField
                    id="survey-intro-title"
                    fieldPath="flow.survey.introTitle"
                    value={settings.introTitle || ''}
                    onChange={(value) => updateSurveyQuestionnaireSettings({ introTitle: value || undefined })}
                    placeholder="Survey"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="survey-intro-message">Message</Label>
                  <CollaborativeField
                    id="survey-intro-message"
                    fieldPath="flow.survey.introMessage"
                    value={settings.introMessage || ''}
                    onChange={(value) => updateSurveyQuestionnaireSettings({ introMessage: value || undefined })}
                    placeholder="Please answer the following questions..."
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Default: Show section overview with survey settings
  return (
    <div className="space-y-6">
      {/* Survey Introduction Settings */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium">Survey Introduction</h4>
          <Switch
            id="survey-intro-toggle"
            checked={settings.showIntro !== false}
            onCheckedChange={(checked) => updateSurveyQuestionnaireSettings({ showIntro: checked })}
          />
        </div>

        {settings.showIntro !== false && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="survey-intro-title-overview">Title</Label>
              <CollaborativeField
                id="survey-intro-title-overview"
                fieldPath="flow.survey.introTitle"
                value={settings.introTitle || ''}
                onChange={(value) => updateSurveyQuestionnaireSettings({ introTitle: value || undefined })}
                placeholder="Survey"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="survey-intro-message-overview">Message</Label>
              <CollaborativeField
                id="survey-intro-message-overview"
                fieldPath="flow.survey.introMessage"
                value={settings.introMessage || ''}
                onChange={(value) => updateSurveyQuestionnaireSettings({ introMessage: value || undefined })}
                placeholder="Please answer the following questions..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Survey Settings - Always Visible */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="h-4 w-4" />
          <h4 className="text-sm font-medium">Survey Settings</h4>
        </div>

        <div className="space-y-4">
          {/* Randomize Questions */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="randomize" className="text-sm font-medium">
                Randomize question order
              </Label>
              <p className="text-xs text-muted-foreground">
                Show questions in random order for each participant
              </p>
            </div>
            <Switch
              id="randomize"
              checked={settings.randomizeQuestions === true}
              onCheckedChange={(checked) =>
                updateSurveyQuestionnaireSettings({ randomizeQuestions: checked })
              }
            />
          </div>

          {/* Show Progress Bar */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="progress-bar" className="text-sm font-medium">
                Show progress bar
              </Label>
              <p className="text-xs text-muted-foreground">
                Display completion progress to participants
              </p>
            </div>
            <Switch
              id="progress-bar"
              checked={settings.showProgressBar !== false}
              onCheckedChange={(checked) =>
                updateSurveyQuestionnaireSettings({ showProgressBar: checked })
              }
            />
          </div>

          {/* Allow Skip Questions */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-skip" className="text-sm font-medium">
                Allow skipping questions
              </Label>
              <p className="text-xs text-muted-foreground">
                Let participants skip non-required questions
              </p>
            </div>
            <Switch
              id="allow-skip"
              checked={settings.allowSkipQuestions === true}
              onCheckedChange={(checked) =>
                updateSurveyQuestionnaireSettings({ allowSkipQuestions: checked })
              }
            />
          </div>

          {/* Page Mode */}
          <div className="space-y-2">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Question display</Label>
              <p className="text-xs text-muted-foreground">
                How questions are presented to participants
              </p>
            </div>
            <RadioGroup
              value={settings.pageMode || 'one_per_page'}
              onValueChange={(value) =>
                updateSurveyQuestionnaireSettings({ pageMode: value as 'one_per_page' | 'all_on_one' })
              }
              className="mt-2 space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="one_per_page" id="survey-one-per-page" />
                <Label htmlFor="survey-one-per-page" className="text-sm font-normal cursor-pointer">
                  One question per page
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all_on_one" id="survey-all-on-one" />
                <Label htmlFor="survey-all-on-one" className="text-sm font-normal cursor-pointer">
                  All questions on one page
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Auto-Advance - Only show for one_per_page mode, progressive mode has built-in auto-advance */}
          {flowSettings.pagination?.mode !== 'progressive' && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-advance" className="text-sm font-medium">
                  Auto-advance after selection
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically move to next question after answering
                </p>
              </div>
              <Switch
                id="auto-advance"
                checked={settings.autoAdvance === true}
                onCheckedChange={(checked) =>
                  updateSurveyQuestionnaireSettings({ autoAdvance: checked })
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Questions Summary */}
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Survey Questions
          </h4>
          <p className="text-sm text-muted-foreground">
            {surveyQuestions.length === 0
              ? 'Add questions to collect participant feedback and insights.'
              : `${surveyQuestions.length} question${surveyQuestions.length === 1 ? '' : 's'} configured. Select a question in the sidebar to edit.`}
          </p>
        </div>
      </div>

      {/* Empty State */}
      {surveyQuestions.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-base font-medium mb-2">No questions yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Click the &quot;+&quot; button in the sidebar to add your first question.
          </p>
          <p className="text-xs text-muted-foreground">
            All 9 question types are available: text, radio, checkbox, dropdown, Likert, NPS, matrix, and ranking.
          </p>
        </div>
      )}

      {/* Custom Sections Panel */}
      <SectionsPanel
        studyId={studyId}
        questions={surveyQuestions}
        selectedSectionId={selectedSectionId}
        onSelectSection={setSelectedSectionId}
      />

      {/* Score Variables Panel */}
      <VariablesPanel
        studyId={studyId}
        questions={allQuestions}
      />
    </div>
  )
}
