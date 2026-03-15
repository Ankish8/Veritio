'use client'

import { ScrollArea } from '@veritio/ui/components/scroll-area'
import { sectionIcons } from '@veritio/prototype-test/lib/study-flow/section-icons'
import { defaultParticipantIdentifierSettings } from '@veritio/prototype-test/lib/study-flow/defaults'
import type { FlowSection } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { FlowStepItem, FlowActivityItem, FlowAgreementSection, FlowPrototypeActivitySection } from '../flow-items'
import { FlowQuestionSection } from '../flow-question-section'
import { FlowDemographicIdentifierSection } from '../flow-demographic-identifier-section'
import type { FlowNavigatorProps } from './types'
import { buildQuestionSectionProps } from './question-section-props'
export function FlowNavigator(props: FlowNavigatorProps) {
  const {
    sections,
    studyType,
    activeFlowSection,
    selectedQuestionId,
    selectedDemographicSectionId,
    flowSettings,
    customSections,
    selectedSectionId,
    getSectionEnabled,
    getQuestionsForSection,
    setActiveFlowSection,
    setSelectedQuestionId,
    setSelectedDemographicSectionId,
    setSelectedSectionId,
    toggleSectionEnabled,
    handleSelectQuestion,
    handleAddQuestion,
    handleAddCustomSection,
    removeQuestion,
    duplicateQuestion,
    removeDemographicSection,
    updateIdentifierSettings,
    updatePreStudySettings,
    updatePostStudySettings,
    updateSurveyQuestionnaireSettings,
    deleteSection,
    updateSection,
    addQuestion,
    reorderQuestions,
    reorderSections,
    onNavigateToContent,
    prototypeTaskCount = 0,
  } = props

  return (
    <nav
      className="w-[280px] lg:w-[300px] xl:w-[320px] 2xl:w-[340px] flex-shrink-0 flex flex-col h-full border-r border-border overflow-hidden"
      aria-label="Study flow steps"
    >
      <div className="px-4 py-4 border-b border-border flex-shrink-0">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Study Flow
          </h3>
          <p className="text-xs text-muted-foreground">
            Configure the participant journey
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1 h-0 w-full scrollbar-hide">
        <div className="p-4 space-y-2">
          {sections.map((section) => {
            const isActive = activeFlowSection === section.id
            const isEnabled = getSectionEnabled(section.enabledKey)

            // Question sections (screening, pre/post study, survey)
            if (section.hasQuestions) {
              const questionProps = buildQuestionSectionProps({
                section,
                flowSettings,
                activeFlowSection,
                selectedQuestionId,
                selectedSectionId,
                customSections,
                isEnabled,
                questions: getQuestionsForSection(section.id),
                setActiveFlowSection,
                setSelectedQuestionId,
                setSelectedSectionId,
                handleSelectQuestion,
                handleAddQuestion,
                toggleSectionEnabled,
                removeQuestion,
                duplicateQuestion,
                reorderQuestions,
                deleteSection,
                updateSection,
                addQuestion,
                handleAddCustomSection,
                reorderSections,
                updatePreStudySettings,
                updatePostStudySettings,
                updateSurveyQuestionnaireSettings,
              })

              return (
                <FlowQuestionSection
                  key={section.id}
                  {...questionProps}
                  icon={sectionIcons[section.id]}
                />
              )
            }

            // Main activity - Prototype Test (special compound section)
            if (section.isMainActivity && studyType === 'prototype_test') {
              return (
                <FlowPrototypeActivitySection
                  key={section.id}
                  isInstructionsActive={isActive}
                  isPrototypeSettingsActive={activeFlowSection === 'prototype_settings'}
                  instructionsEnabled={flowSettings.activityInstructions?.enabled}
                  taskCount={prototypeTaskCount}
                  onSelectInstructions={() => {
                    setActiveFlowSection(section.id)
                    setSelectedQuestionId(null)
                  }}
                  onSelectPrototype={() => {
                    setActiveFlowSection('prototype_settings')
                    setSelectedQuestionId(null)
                  }}
                  onToggleInstructions={() => {
                    toggleSectionEnabled('activityInstructions')
                  }}
                />
              )
            }

            // Main activity (Card sort / Tree test)
            if (section.isMainActivity) {
              return (
                <FlowActivityItem
                  key={section.id}
                  title={section.title}
                  studyType={studyType}
                  isActive={isActive}
                  onSelect={() => {
                    setActiveFlowSection(section.id)
                    setSelectedQuestionId(null)
                  }}
                />
              )
            }

            // Agreement section with rejection message
            if (section.id === 'agreement') {
              return (
                <FlowAgreementSection
                  key={section.id}
                  icon={sectionIcons[section.id]}
                  title={section.title}
                  description={section.description}
                  isActive={isActive}
                  isEnabled={isEnabled}
                  onSelect={() => {
                    setActiveFlowSection(section.id)
                    setSelectedQuestionId(null)
                  }}
                  onToggle={() => toggleSectionEnabled(section.enabledKey!)}
                  showRejectionMessage={flowSettings.participantAgreement?.showRejectionMessage !== false}
                  rejectionTitle={flowSettings.participantAgreement?.rejectionTitle}
                  onSelectRejection={() => {
                    setActiveFlowSection('agreement')
                    setSelectedQuestionId('rejection')
                  }}
                  isRejectionSelected={
                    activeFlowSection === 'agreement' && selectedQuestionId === 'rejection'
                  }
                />
              )
            }

            // Participant identifier with demographics
            if (section.id === 'identifier') {
              const demographicProfile = flowSettings.participantIdentifier?.demographicProfile
              const isAnonymous = flowSettings.participantIdentifier?.type === 'anonymous'

              return (
                <FlowDemographicIdentifierSection
                  key={section.id}
                  title={section.title}
                  description={section.description}
                  isActive={isActive}
                  icon={sectionIcons[section.id]}
                  isAnonymous={isAnonymous}
                  onSelectAnonymous={() => {
                    setActiveFlowSection('identifier')
                    setSelectedDemographicSectionId(null)
                    updateIdentifierSettings({ type: 'anonymous' })
                  }}
                  onSelectDemographic={() => {
                    setActiveFlowSection('identifier')
                    // Auto-select the first demographic section instead of showing parent settings
                    const firstSectionId = demographicProfile?.sections?.[0]?.id
                      ?? defaultParticipantIdentifierSettings.demographicProfile?.sections?.[0]?.id
                      ?? 'basic-demographics'
                    setSelectedDemographicSectionId(firstSectionId)
                    if (!demographicProfile) {
                      updateIdentifierSettings({
                        type: 'demographic_profile',
                        demographicProfile: defaultParticipantIdentifierSettings.demographicProfile
                      })
                    } else {
                      updateIdentifierSettings({ type: 'demographic_profile' })
                    }
                  }}
                  demographicSections={demographicProfile?.sections || []}
                  selectedSectionId={activeFlowSection === 'identifier' ? selectedDemographicSectionId : null}
                  onSelectSection={(sectionId) => {
                    setActiveFlowSection('identifier')
                    setSelectedDemographicSectionId(sectionId)
                  }}
                  onAddSection={() => {
                    setActiveFlowSection('identifier')
                    setSelectedDemographicSectionId('add-section')
                  }}
                  onRemoveSection={(sectionId) => {
                    removeDemographicSection(sectionId)
                    setSelectedDemographicSectionId(null)
                  }}
                />
              )
            }

            // Simple section (welcome, thank you, closed)
            return (
              <FlowStepItem
                key={section.id}
                icon={sectionIcons[section.id]}
                title={section.title}
                description={section.description}
                isActive={isActive}
                isEnabled={isEnabled}
                hasToggle={!!section.enabledKey}
                onSelect={() => {
                  setActiveFlowSection(section.id)
                  setSelectedQuestionId(null)
                }}
                onToggle={
                  section.enabledKey
                    ? () => toggleSectionEnabled(section.enabledKey!)
                    : undefined
                }
              />
            )
          })}
        </div>
      </ScrollArea>
    </nav>
  )
}
