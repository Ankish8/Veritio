'use client'

import { useMemo, useEffect, useCallback, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Loader2 } from 'lucide-react'
import { cn, useBreakpoint } from '@veritio/ui'
import { useLazyLoad } from '@/hooks/use-lazy-load'
import { useFloatingActionBar } from '@/components/analysis/shared/floating-action-bar/FloatingActionBarContext'
import { useAiRefineInline } from '@/components/ai-refine'
import { usePrototypeTestTasks } from '@veritio/prototype-test/stores/prototype-test-builder'
import { useFlowBuilder } from './hooks'
import { buildSections, type SectionConfig } from './section-config'
import { FlowNavigator } from './flow-navigator'
import { FlowEditorPanel } from './flow-editor-panel'
import { StudyFlowPreview } from './preview'
import { MobileLayout } from './mobile'
import { RichTextRefineProvider } from './sections/rich-text-refine-context'
import type { RefineSlots } from './sections/rich-text-refine-context'

interface StudyFlowBuilderProps {
  studyId: string
  projectId?: string
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
  onNavigateToContent?: () => void
  onNavigateToTasks?: () => void
}
export function StudyFlowBuilder({
  studyId,
  projectId,
  studyType,
  onNavigateToContent,
  onNavigateToTasks,
}: StudyFlowBuilderProps) {
  // Lazy loading: defer expensive hooks until component is visible
  const { containerRef, shouldLoad } = useLazyLoad()

  // Show placeholder until the tab becomes visible
  if (!shouldLoad) {
    return (
      <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden flex items-center justify-center">
        <div className="text-center space-y-2">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading study flow...</p>
        </div>
      </div>
    )
  }

  // Once visible, render the actual content
  return (
    <StudyFlowBuilderContent
      studyId={studyId}
      projectId={projectId}
      studyType={studyType}
      onNavigateToContent={onNavigateToContent}
      onNavigateToTasks={onNavigateToTasks}
    />
  )
}
function StudyFlowBuilderContent({
  studyId,
  projectId,
  studyType,
  onNavigateToContent,
  onNavigateToTasks,
}: StudyFlowBuilderProps) {
  const { isMobile } = useBreakpoint()
  const { activePanel } = useFloatingActionBar()
  const isAssistantOpen = activePanel === 'ai-assistant'

  const flow = useFlowBuilder({ studyId, studyType })

  // Get prototype tasks count (only used for prototype_test studies)
  const prototypeTasks = usePrototypeTestTasks()
  const prototypeTaskCount = studyType === 'prototype_test' ? prototypeTasks.length : 0

  // Build section configuration
  const sections = useMemo(() => buildSections({
    studyId,
    studyType,
    selectedDemographicSectionId: flow.selectedDemographicSectionId,
    setSelectedDemographicSectionId: flow.setSelectedDemographicSectionId,
    onNavigateToContent,
    onNavigateToTasks,
    onNavigateToPrototype: onNavigateToContent, // Edit Prototype goes to the Prototype/Content tab
  }), [studyId, studyType, flow.selectedDemographicSectionId, flow.setSelectedDemographicSectionId, onNavigateToContent, onNavigateToTasks])

  // Listen for keyboard shortcut events
  useEffect(() => {
    const handleKeyboardAddQuestion = () => {
      // Add a new question to the current active section
      if (flow.activeFlowSection) {
        flow.handleAddQuestion(flow.activeFlowSection)
      }
    }

    window.addEventListener('builder:add-question', handleKeyboardAddQuestion)
    return () => {
      window.removeEventListener('builder:add-question', handleKeyboardAddQuestion)
    }
  }, [flow.handleAddQuestion, flow.activeFlowSection])

  // Loading state
  if (!flow.isHydrated) {
    return (
      <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const InlineRefineWrapper = useCallback(
    ({ children }: { children: (slots: RefineSlots) => React.ReactNode }) => {
      return <StudyFlowRefineField>{children}</StudyFlowRefineField>
    },
    [],
  )

  const activeSection = sections.find((s) => s.id === flow.activeFlowSection)
  const isSectionDisabled = activeSection?.enabledKey && !flow.getSectionEnabled(activeSection.enabledKey)

  // Mobile layout
  if (isMobile) {
    return (
      <RichTextRefineProvider RefineWrapper={InlineRefineWrapper}>
      <div className="flex-1 min-h-0 overflow-hidden">
        <MobileLayout
          sections={sections}
          activeSection={activeSection}
          activeFlowSection={flow.activeFlowSection}
          currentSectionIndex={sections.findIndex((s) => s.id === flow.activeFlowSection)}
          studyType={studyType}
          studyId={studyId}
          isSectionDisabled={!!isSectionDisabled}
          getSectionEnabled={flow.getSectionEnabled}
          setActiveFlowSection={flow.setActiveFlowSection}
          setSelectedQuestionId={flow.setSelectedQuestionId}
          toggleSectionEnabled={flow.toggleSectionEnabled}
        />
      </div>
      </RichTextRefineProvider>
    )
  }

  // Desktop layout
  return (
    <RichTextRefineProvider RefineWrapper={InlineRefineWrapper}>
    <div className="flex-1 min-h-0 overflow-hidden">
      {/* Skip link for accessibility */}
      <a
        href="#flow-editor"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to editor
      </a>

      <div className="h-full flex gap-0">
        {/* LEFT: Flow Navigator */}
        <FlowNavigator
          sections={sections}
          studyType={studyType}
          activeFlowSection={flow.activeFlowSection}
          selectedQuestionId={flow.selectedQuestionId}
          selectedDemographicSectionId={flow.selectedDemographicSectionId}
          flowSettings={flow.flowSettings}
          customSections={flow.customSections}
          selectedSectionId={flow.selectedSectionId}
          getSectionEnabled={flow.getSectionEnabled}
          getQuestionsForSection={flow.getQuestionsForSection}
          setActiveFlowSection={flow.setActiveFlowSection}
          setSelectedQuestionId={flow.setSelectedQuestionId}
          setSelectedDemographicSectionId={flow.setSelectedDemographicSectionId}
          setSelectedSectionId={flow.setSelectedSectionId}
          toggleSectionEnabled={flow.toggleSectionEnabled}
          handleSelectQuestion={flow.handleSelectQuestion}
          handleAddQuestion={flow.handleAddQuestion}
          handleAddCustomSection={flow.handleAddCustomSection}
          removeQuestion={flow.removeQuestion}
          duplicateQuestion={flow.duplicateQuestion}
          removeDemographicSection={flow.removeDemographicSection}
          updateIdentifierSettings={flow.updateIdentifierSettings}
          updatePreStudySettings={flow.updatePreStudySettings}
          updatePostStudySettings={flow.updatePostStudySettings}
          updateSurveyQuestionnaireSettings={flow.updateSurveyQuestionnaireSettings}
          deleteSection={flow.deleteSection}
          updateSection={flow.updateSection}
          addQuestion={flow.addQuestion}
          reorderQuestions={flow.reorderQuestions}
          reorderSections={flow.reorderSections}
          onNavigateToContent={onNavigateToContent}
          prototypeTaskCount={prototypeTaskCount}
        />

        {/* MIDDLE: Editor Panel */}
        <FlowEditorPanel
          activeSection={activeSection}
          isSectionDisabled={!!isSectionDisabled}
          selectedQuestion={flow.selectedQuestion}
          selectedQuestionId={flow.selectedQuestionId}
          activeFlowSection={flow.activeFlowSection}
          toggleSectionEnabled={flow.toggleSectionEnabled}
          setSelectedQuestionId={flow.setSelectedQuestionId}
          updateQuestion={flow.updateQuestion}
        />

        {/* RIGHT: Preview Panel — collapses when AI assistant is open */}
        <aside
          className={cn(
            "hidden min-[1200px]:block flex-shrink-0 border-l border-border overflow-hidden",
            "transition-[width,opacity] duration-300 ease-in-out",
            isAssistantOpen
              ? "w-0 opacity-0"
              : "min-[1200px]:w-[340px] min-[1440px]:w-[420px] 2xl:w-[480px]"
          )}
          aria-label="Live preview"
        >
          <StudyFlowPreview studyType={studyType} studyId={studyId} />
        </aside>
      </div>
    </div>
    </RichTextRefineProvider>
  )
}

// ---------------------------------------------------------------------------
// Inline AI refine wrapper — one instance per editor field
// ---------------------------------------------------------------------------

function StudyFlowRefineField({
  children,
}: {
  children: (slots: RefineSlots) => React.ReactNode
}) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const { toolbarButton, overlay } = useAiRefineInline({
    editor,
    context: 'Study flow content for a UX research study',
  })

  const handleEditorCreated = useCallback((ed: Editor) => {
    setEditor(ed)
  }, [])

  return <>{children({ trailingSlot: toolbarButton, overlaySlot: overlay, onEditorCreated: handleEditorCreated })}</>
}
