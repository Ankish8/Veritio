'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import { Switch } from '@veritio/ui/components/switch'
import { DeleteConfirmationDialog } from '@veritio/ui/components/delete-confirmation-dialog'
import { cn } from '@veritio/ui'
import { ChevronRight, Settings2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { StudyFlowQuestion, SurveyCustomSection } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { SectionContainer } from './section-container'
import {
  IntroMessageCard,
  RejectionMessageCard,
  QuestionListItem,
  SectionActionButtons,
} from './sections'

interface FlowQuestionSectionProps {
  title: string
  description: string
  questions: StudyFlowQuestion[]
  isActive: boolean
  isEnabled: boolean
  activeQuestionId: string | null
  onSelectSection: () => void
  onSelectQuestion: (id: string) => void
  onToggle: () => void
  onAddQuestion: () => void
  onDeleteQuestion: (questionId: string) => void
  onDuplicateQuestion: (questionId: string) => void
  sectionId?: string
  rejectionSettings?: { rejectionTitle: string; rejectionMessage: string }
  onSelectRejection?: () => void
  isRejectionSelected?: boolean
  introSettings?: { introTitle?: string; introMessage?: string; enabled?: boolean }
  onSelectIntro?: () => void
  isIntroSelected?: boolean
  onToggleIntro?: (enabled: boolean) => void
  hasToggle?: boolean // Whether to show the toggle switch (default: true for backwards compatibility)
  onAddSection?: () => void // Optional callback to add a section (only shown if provided)
  customSections?: SurveyCustomSection[] // Custom sections to display (for survey questionnaire)
  onSelectCustomSection?: (sectionId: string) => void // Callback when a custom section is selected
  onDeleteCustomSection?: (sectionId: string) => void // Callback when a custom section is deleted
  onRenameCustomSection?: (sectionId: string, newName: string) => void // Callback when a custom section is renamed
  onAddQuestionToSection?: (sectionId: string) => void // Callback to add a question to a specific section
  selectedCustomSectionId?: string | null // Currently selected custom section ID
  icon?: LucideIcon // Icon to display in the section header
  isMainActivity?: boolean // Whether this is the main activity section (for visual distinction)
  onSettingsClick?: () => void // Optional callback to open settings without collapsing
  onMoveQuestionUp?: (questionId: string) => void // Callback to move ungrouped question up
  onMoveQuestionDown?: (questionId: string) => void // Callback to move ungrouped question down
  onMoveQuestionUpInSection?: (questionId: string) => void // Callback to move question up within a section
  onMoveQuestionDownInSection?: (questionId: string) => void // Callback to move question down within a section
  onMoveSectionUp?: (sectionId: string) => void | Promise<void> // Callback to move custom section up
  onMoveSectionDown?: (sectionId: string) => void | Promise<void> // Callback to move custom section down
}
export const FlowQuestionSection = memo(function FlowQuestionSection({
  title,
  description,
  questions,
  isActive,
  isEnabled,
  activeQuestionId,
  onSelectSection,
  onSelectQuestion,
  onToggle,
  onAddQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  sectionId,
  rejectionSettings,
  onSelectRejection,
  isRejectionSelected,
  introSettings,
  onSelectIntro,
  isIntroSelected,
  hasToggle = true,
  onAddSection,
  customSections,
  onSelectCustomSection,
  onDeleteCustomSection,
  onRenameCustomSection,
  onAddQuestionToSection,
  selectedCustomSectionId,
  icon: Icon,
  isMainActivity,
  onSettingsClick,
  onMoveQuestionUp,
  onMoveQuestionDown,
  onMoveQuestionUpInSection,
  onMoveQuestionDownInSection,
  onMoveSectionUp,
  onMoveSectionDown,
}: FlowQuestionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [questionToDelete, setQuestionToDelete] = useState<{ id: string; text: string } | null>(null)

  // Stable handlers for child components
  const handleConfirmDelete = useCallback(() => {
    if (questionToDelete) {
      onDeleteQuestion(questionToDelete.id)
      setQuestionToDelete(null)
    }
  }, [questionToDelete, onDeleteQuestion])

  const handleCancelDelete = useCallback(() => {
    setQuestionToDelete(null)
  }, [])

  // Group questions by their custom_section_id
  const { sectionQuestions, ungroupedQuestions } = useMemo(() => {
    if (!customSections || customSections.length === 0) {
      return { sectionQuestions: new Map(), ungroupedQuestions: questions }
    }

    const grouped = new Map<string, StudyFlowQuestion[]>()
    const ungrouped: StudyFlowQuestion[] = []

    // Initialize groups for each section
    customSections.forEach((section) => {
      grouped.set(section.id, [])
    })

    // Sort questions into groups
    questions.forEach((q) => {
      if (q.custom_section_id && grouped.has(q.custom_section_id)) {
        grouped.get(q.custom_section_id)!.push(q)
      } else {
        ungrouped.push(q)
      }
    })

    return { sectionQuestions: grouped, ungroupedQuestions: ungrouped }
  }, [questions, customSections])

  const handleClick = () => {
    if (isEnabled) {
      onSelectSection()
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <div
      className={cn(
        'rounded-lg border transition-all overflow-hidden',
        isMainActivity
          ? cn('bg-primary/[0.03] border-primary/30', isActive && 'ring-1 ring-primary/20')
          : isActive && isEnabled
            ? 'border-border bg-muted/40'
            : isEnabled
              ? 'border-border/50 bg-muted/20 hover:border-border'
              : 'border-dashed border-border/40 bg-muted/20'
      )}
    >
      {/* Section header */}
      <div
        role={isEnabled ? 'button' : undefined}
        tabIndex={isEnabled ? 0 : undefined}
        onClick={isEnabled ? handleClick : undefined}
        onKeyDown={
          isEnabled
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleClick()
                }
              }
            : undefined
        }
        className={cn(
          'w-full text-left px-4 py-2.5 transition-all',
          isEnabled ? 'cursor-pointer' : 'cursor-default'
        )}
        aria-current={isActive && isEnabled ? 'step' : undefined}
        aria-expanded={isExpanded && isEnabled}
      >
        <div className="flex items-center justify-between gap-4">
          <div className={cn('flex items-center gap-2 flex-1 min-w-0', !isEnabled && 'opacity-50')}>
            <ChevronRight
              className={cn(
                'h-4 w-4 transition-transform text-muted-foreground shrink-0 self-start mt-0.5',
                isExpanded && isEnabled && 'rotate-90',
                !isEnabled && 'opacity-30'
              )}
            />
            <div className="flex-1 min-w-0">
              <span
                className={cn(
                  'text-sm font-medium block',
                  isActive && isEnabled ? 'text-foreground' : 'text-foreground/80',
                  !isEnabled && 'text-muted-foreground'
                )}
              >
                {title}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>

          {/* Settings button - for survey section */}
          {onSettingsClick && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSettingsClick()
              }}
              className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
              aria-label="Open settings"
            >
              <Settings2 className="h-4 w-4 text-muted-foreground" />
            </button>
          )}

          {hasToggle && (
            <Switch
              checked={isEnabled}
              onCheckedChange={onToggle}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Toggle ${title}`}
              className="shrink-0 cursor-pointer"
            />
          )}
        </div>
      </div>

      {/* Nested questions */}
      {isExpanded && isEnabled && (
        <div className="px-4 pb-3 space-y-2 overflow-hidden w-full max-w-full">
          {/* Introductory message card - only for survey section (other sections have intro in Settings) */}
          {sectionId === 'survey' && introSettings && questions.length > 0 && onSelectIntro && (
            <IntroMessageCard
              title={introSettings.introTitle}
              sectionId={sectionId}
              isSelected={isIntroSelected ?? false}
              onClick={onSelectIntro}
            />
          )}

          {/* Ungrouped questions first (not in any section) */}
          {ungroupedQuestions.map((q, idx) => (
            <QuestionListItem
              key={q.id}
              question={q}
              isActive={activeQuestionId === q.id}
              index={idx}
              onSelect={() => onSelectQuestion(q.id)}
              onDuplicate={() => onDuplicateQuestion(q.id)}
              onDelete={() => setQuestionToDelete({ id: q.id, text: q.question_text || 'Untitled question' })}
              onMoveUp={onMoveQuestionUp ? () => onMoveQuestionUp(q.id) : undefined}
              onMoveDown={onMoveQuestionDown ? () => onMoveQuestionDown(q.id) : undefined}
              canMoveUp={idx > 0}
              canMoveDown={idx < ungroupedQuestions.length - 1}
            />
          ))}

          {/* Custom sections at the bottom (after ungrouped questions) */}
          {customSections && customSections.length > 0 && (
            <>
              {customSections.map((section, sectionIdx) => (
                <SectionContainer
                  key={section.id}
                  section={section}
                  questions={sectionQuestions.get(section.id) || []}
                  isSelected={selectedCustomSectionId === section.id}
                  activeQuestionId={activeQuestionId}
                  onSelectSection={() => onSelectCustomSection?.(section.id)}
                  onSelectQuestion={onSelectQuestion}
                  onAddQuestion={() => onAddQuestionToSection?.(section.id)}
                  onDeleteQuestion={onDeleteQuestion}
                  onDuplicateQuestion={onDuplicateQuestion}
                  onDeleteSection={() => onDeleteCustomSection?.(section.id)}
                  onRenameSection={(newName) => onRenameCustomSection?.(section.id, newName)}
                  onMoveQuestionUp={onMoveQuestionUpInSection}
                  onMoveQuestionDown={onMoveQuestionDownInSection}
                  onMoveSectionUp={onMoveSectionUp ? () => onMoveSectionUp(section.id) : undefined}
                  onMoveSectionDown={onMoveSectionDown ? () => onMoveSectionDown(section.id) : undefined}
                  canMoveSectionUp={sectionIdx > 0}
                  canMoveSectionDown={sectionIdx < customSections.length - 1}
                />
              ))}
            </>
          )}

          {/* Action buttons */}
          <SectionActionButtons onAddQuestion={onAddQuestion} onAddSection={onAddSection} />

          {/* Rejection message card - only for screening section */}
          {sectionId === 'screening' && questions.length > 0 && rejectionSettings && onSelectRejection && (
            <RejectionMessageCard
              title={rejectionSettings.rejectionTitle}
              isSelected={isRejectionSelected ?? false}
              onClick={onSelectRejection}
            />
          )}
        </div>
      )}

      {/* Delete Question Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={!!questionToDelete}
        onOpenChange={(open) => !open && handleCancelDelete()}
        title="Delete question?"
        description={`Are you sure you want to delete "${questionToDelete?.text}"? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
})
