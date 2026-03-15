'use client'

import { Button } from '@veritio/ui/components/button'
import { ScrollArea } from '@veritio/ui/components/scroll-area'
import { Power, Settings2 } from 'lucide-react'
import type { StudyFlowQuestion, QuestionType } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { getDefaultQuestionConfig } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { PrePostTypeSwitcher } from './question-builder/pre-post-type-switcher'
import type { SectionConfig } from './section-config'

interface FlowEditorPanelProps {
  activeSection: SectionConfig | undefined
  isSectionDisabled: boolean
  selectedQuestion: StudyFlowQuestion | null
  selectedQuestionId: string | null
  activeFlowSection: string
  toggleSectionEnabled: (key: string) => void
  setSelectedQuestionId: (id: string | null) => void
  updateQuestion: (id: string, updates: Partial<StudyFlowQuestion>) => void
}
export function FlowEditorPanel({
  activeSection,
  isSectionDisabled,
  selectedQuestion,
  selectedQuestionId,
  activeFlowSection,
  toggleSectionEnabled,
  setSelectedQuestionId,
  updateQuestion,
}: FlowEditorPanelProps) {
  if (!activeSection) return null

  return (
    <main
      id="flow-editor"
      className="flex-1 min-w-0 overflow-hidden flex flex-col"
      role="main"
      aria-label="Flow section editor"
    >
      {/* Section Header */}
      <header className="px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {activeSection.title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {activeSection.description}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Question type switcher - shown when a question is selected (not for screening, which has its own) */}
            {selectedQuestion && activeFlowSection !== 'screening' && (
              <PrePostTypeSwitcher
                currentType={selectedQuestion.question_type}
                onTypeChange={(newType: QuestionType) => {
                  updateQuestion(selectedQuestion.id, {
                    question_type: newType,
                    config: getDefaultQuestionConfig(newType),
                  })
                }}
              />
            )}
            {/* Show Settings button when viewing a question in survey section */}
            {activeFlowSection === 'survey' && selectedQuestionId && selectedQuestionId !== 'intro' && (
              <Button
                variant="outline"
                size="icon"
                className="flex-shrink-0"
                onClick={() => setSelectedQuestionId(null)}
                title="Survey Settings"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Section Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-6 px-6 py-4">
          {isSectionDisabled ? (
            <DisabledSectionMessage
              title={activeSection.title}
              enabledKey={activeSection.enabledKey!}
              onEnable={() => toggleSectionEnabled(activeSection.enabledKey!)}
            />
          ) : (
            activeSection.component
          )}
        </div>
      </ScrollArea>
    </main>
  )
}

interface DisabledSectionMessageProps {
  title: string
  enabledKey: string
  onEnable: () => void
}

function DisabledSectionMessage({ title, onEnable }: DisabledSectionMessageProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center space-y-4">
      <div className="space-y-2">
        <h3 className="text-base font-medium text-foreground/80">
          {title} is currently disabled
        </h3>
        <p className="text-sm text-muted-foreground">
          Enable this section to configure its settings and add it to your study flow.
        </p>
      </div>
      <Button onClick={onEnable} variant="default" size="default" className="gap-2">
        <Power className="h-4 w-4" />
        Enable {title}
      </Button>
    </div>
  )
}
