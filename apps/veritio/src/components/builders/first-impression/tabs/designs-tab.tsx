'use client'

import { memo, useCallback, useMemo, useState } from 'react'

import { Plus, Image, MessageSquareText, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import {
  useFirstImpressionDesigns,
  useFirstImpressionActions,
  useFirstImpressionSettings,
  useFirstImpressionSharedQuestions,
} from '@/stores/study-builder'
import { DesignList } from '../design-list'
import { DesignQuestionsModal } from '../design-questions-modal'
import { EmptyStateCard, useDeletionDialog } from '@/components/builders/shared/settings'
import type { FirstImpressionDesign } from '@veritio/study-types/study-flow-types'

interface DesignsTabProps {
  studyId: string
}

function DesignsTabComponent({ studyId }: DesignsTabProps) {
  const designs = useFirstImpressionDesigns()
  const settings = useFirstImpressionSettings()
  const sharedQuestions = useFirstImpressionSharedQuestions()
  const { addDesign, removeDesign, reorderDesigns } = useFirstImpressionActions()
  const [sharedQuestionsModalOpen, setSharedQuestionsModalOpen] = useState(false)

  // Use shared deletion dialog hook
  const deletion = useDeletionDialog<string>()

  const questionMode = settings.questionMode ?? 'shared'
  const isSharedMode = questionMode === 'shared'
  const firstNonPracticeDesign = (designs || []).find((d) => !d.is_practice)

  // Show per-card weight controls when there are 2+ non-practice designs
  const showWeightControls = useMemo(() => {
    if (!designs) return false
    const nonPracticeDesigns = designs.filter((d) => !d.is_practice)
    return nonPracticeDesigns.length >= 2
  }, [designs])

  const handleAddDesign = addDesign

  const handleReorderDesigns = useCallback(
    (reorderedDesigns: FirstImpressionDesign[]) => {
      // Update position field for each design
      const designsWithPosition = reorderedDesigns.map((design, index) => ({
        ...design,
        position: index,
      }))
      reorderDesigns(designsWithPosition)
    },
    [reorderDesigns]
  )

  // Empty state
  if (!designs || designs.length === 0) {
    return (
      <div className="flex-1 flex flex-col p-3 sm:p-4 lg:p-6">
        <EmptyStateCard
          icon={Image}
          title="No designs yet"
          description="Add your first design to get started. Each design will be shown to participants for a brief moment to capture their first impressions."
          action={{
            label: 'Add first design',
            icon: Plus,
            onClick: handleAddDesign,
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-4 lg:p-6">
      {/* Header with Add Design button on the right */}
      <div className="flex-shrink-0 mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Designs</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Add designs to show participants. Each design will be shown briefly to capture first impressions.
          </p>
        </div>
        <Button variant="secondary" onClick={handleAddDesign} className="flex-shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Add Design
        </Button>
      </div>

      {/* Shared Questions Card - only in shared mode with designs */}
      {isSharedMode && firstNonPracticeDesign && (
        <div className="flex-shrink-0 mb-4">
          <button
            onClick={() => setSharedQuestionsModalOpen(true)}
            className="w-full flex items-center gap-3 p-4 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 hover:border-border transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-md bg-background border flex items-center justify-center shrink-0">
              <MessageSquareText className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Post-Design Questions</span>
                {sharedQuestions.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {sharedQuestions.length}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {sharedQuestions.length > 0
                  ? 'Same questions shown after each design exposure'
                  : 'Add questions to ask after each design exposure'}
              </p>
            </div>
            <Pencil className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </div>
      )}

      {/* Scrollable design list */}
      <div className="flex-1 overflow-y-auto">
        <DesignList
          studyId={studyId}
          designs={designs}
          onReorder={handleReorderDesigns}
          onDelete={deletion.openDialog}
          showWeightControls={showWeightControls}
        />
      </div>

      <DeleteConfirmationDialog
        open={deletion.isOpen}
        onOpenChange={(open) => !open && deletion.closeDialog()}
        onConfirm={() => deletion.confirmDeletion(removeDesign)}
        title="Delete design?"
        description="This will permanently delete this design and all associated questions. This action cannot be undone."
      />

      {/* Shared Questions Modal */}
      {isSharedMode && firstNonPracticeDesign && (
        <DesignQuestionsModal
          open={sharedQuestionsModalOpen}
          onOpenChange={setSharedQuestionsModalOpen}
          design={firstNonPracticeDesign}
          designNumber={1}
          studyId={studyId}
          mode="shared"
        />
      )}
    </div>
  )
}

export const DesignsTab = memo(
  DesignsTabComponent,
  (prev, next) => prev.studyId === next.studyId
)
