'use client'

import { useState } from 'react'
import { ScrollArea } from '@veritio/ui/components/scroll-area'
import { Button } from '@veritio/ui/components/button'
import { Power } from 'lucide-react'
import { MobileFlowHeader } from './mobile-flow-header'
import { MobileFlowBottomSheet } from './mobile-flow-bottom-sheet'
import { MobilePreviewOverlay } from './mobile-preview-overlay'
import type { ActiveFlowSection } from '@veritio/prototype-test/stores'

interface SectionConfig {
  id: ActiveFlowSection
  title: string
  description: string
  enabledKey?: string
  component: React.ReactNode
}

interface MobileLayoutProps {
  sections: SectionConfig[]
  activeSection: SectionConfig | undefined
  activeFlowSection: ActiveFlowSection
  currentSectionIndex: number
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
  studyId: string
  isSectionDisabled: boolean
  getSectionEnabled: (key?: string) => boolean
  setActiveFlowSection: (section: ActiveFlowSection) => void
  setSelectedQuestionId: (id: string | null) => void
  toggleSectionEnabled: (key: string) => void
}
export function MobileLayout({
  sections,
  activeSection,
  activeFlowSection,
  currentSectionIndex,
  studyType,
  studyId,
  isSectionDisabled,
  getSectionEnabled,
  setActiveFlowSection,
  setSelectedQuestionId,
  toggleSectionEnabled,
}: MobileLayoutProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Prepare sections for bottom sheet
  const bottomSheetSections = sections.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    isEnabled: getSectionEnabled(section.enabledKey),
  }))

  // Handle section selection from bottom sheet
  const handleSelectSection = (sectionId: ActiveFlowSection) => {
    setActiveFlowSection(sectionId)
    setSelectedQuestionId(null)
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Sticky header */}
      <MobileFlowHeader
        title={activeSection?.title || 'Study Flow'}
        description={activeSection?.description || 'Configure your study'}
        onOpenPreview={() => setIsPreviewOpen(true)}
      />

      {/* Scrollable editor content */}
      <ScrollArea className="flex-1 pb-24">
        <div className="px-4 py-4 space-y-6">
          {activeSection && (
            <>
              {isSectionDisabled ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-base font-medium text-foreground/80">
                      {activeSection.title} is currently disabled
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Enable this section to configure its settings.
                    </p>
                  </div>
                  <Button
                    onClick={() => toggleSectionEnabled(activeSection.enabledKey!)}
                    variant="default"
                    size="default"
                    className="gap-2"
                  >
                    <Power className="h-4 w-4" />
                    Enable Section
                  </Button>
                </div>
              ) : (
                activeSection.component
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Bottom sheet navigation */}
      <MobileFlowBottomSheet
        sections={bottomSheetSections}
        activeSection={activeFlowSection}
        currentSectionIndex={currentSectionIndex}
        onSelectSection={handleSelectSection}
      />

      {/* Preview overlay */}
      <MobilePreviewOverlay
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        studyType={studyType}
        studyId={studyId}
      />
    </div>
  )
}
