'use client'

import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import { QuestionTypeCards } from '../question-builder/question-type-cards'
import { ScreeningQuestionEditor } from '../question-builder/screening-question-editor'
import { RejectionMessageEditor } from '../question-builder/rejection-message-editor'
import { Alert, AlertDescription } from '@veritio/ui/components/alert'
import { Label } from '@veritio/ui/components/label'
import { RadioGroup, RadioGroupItem } from '@veritio/ui/components/radio-group'
import { AlertCircle, MousePointerClick, Settings2 } from 'lucide-react'
import type { QuestionType } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { getDefaultQuestionConfig } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { CollaborativeField } from './collaborative-field'
const SCREENING_ALLOWED_TYPES: QuestionType[] = ['multiple_choice', 'yes_no']
export function ScreeningSection() {
  const {
    flowSettings,
    screeningQuestions,
    selectedQuestionId,
    updateQuestion,
    updateScreeningSettings,
  } = useStudyFlowBuilderStore()
  const { screening } = flowSettings

  // Find the selected question
  const selectedQuestion = selectedQuestionId
    ? screeningQuestions.find((q) => q.id === selectedQuestionId)
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

  // Show rejection message editor when 'rejection' is selected
  if (selectedQuestionId === 'rejection') {
    return <RejectionMessageEditor />
  }

  // Show type picker for newly created questions
  if (selectedQuestion && isNewQuestion) {
    return (
      <div className="space-y-4">
        <QuestionTypeCards
          onSelect={handleTypeSelect}
          title="Questions:"
          description="Select the type of screening question you want to add."
          allowedTypes={SCREENING_ALLOWED_TYPES}
        />
      </div>
    )
  }

  // Show question editor for existing questions with type already set
  if (selectedQuestion && !isNewQuestion) {
    return <ScreeningQuestionEditor question={selectedQuestion} />
  }

  // Show settings view when 'settings' is selected from sidebar
  if (selectedQuestionId === 'settings') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Screening Settings
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure screening section appearance and behavior
          </p>
        </div>

        {/* Introductory Message Section */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-1">Section Header</h4>
            <p className="text-xs text-muted-foreground">
              Shown at the top of the screening questions section
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="screening-intro-title">Title</Label>
              <CollaborativeField
                id="screening-intro-title"
                fieldPath="flow.screening.introTitle"
                value={screening.introTitle || ''}
                onChange={(value) => updateScreeningSettings({ introTitle: value || undefined })}
                placeholder="Quick Eligibility Check"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="screening-intro-message">Subtitle Message</Label>
              <CollaborativeField
                id="screening-intro-message"
                fieldPath="flow.screening.introMessage"
                value={screening.introMessage || ''}
                onChange={(value) => updateScreeningSettings({ introMessage: value || undefined })}
                placeholder="Please answer these brief questions to confirm eligibility."
              />
              <p className="text-xs text-muted-foreground">
                A brief description shown below the title to set context for participants
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
            value={screening.pageMode || 'one_per_page'}
            onValueChange={(value) =>
              updateScreeningSettings({ pageMode: value as 'one_per_page' | 'all_on_one' })
            }
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="one_per_page" id="screening-one-per-page" />
              <Label htmlFor="screening-one-per-page" className="text-sm font-normal cursor-pointer">
                One question per page
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all_on_one" id="screening-all-on-one" />
              <Label htmlFor="screening-all-on-one" className="text-sm font-normal cursor-pointer">
                All questions on one page
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    )
  }

  // No question selected - show empty state
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <MousePointerClick className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">Select a question to edit</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {screeningQuestions.length === 0
            ? 'Click the + button in the sidebar to add your first screening question.'
            : 'Click on a question in the sidebar to edit it, or add a new one.'}
        </p>
        {screeningQuestions.length === 0 && (
          <Alert className="mt-6 max-w-md text-left">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Screening questions filter participants based on criteria.
              Use branching logic to reject those who don&apos;t qualify.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
