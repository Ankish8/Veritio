'use client'

import {
  DndContext,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus, Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DraggableCard,
  CardOverlay,
  DroppableCardsArea,
  DroppableCategory,
  NewGroupDropZone,
} from './drag-components'
import type { CardWithImage } from '@veritio/study-types'
import type { ExtendedCardSortSettings, RecordingProps } from './card-sort-types'
import type { ThinkAloudPromptPosition } from '@/components/builders/shared/types'

interface CategoryItem {
  id: string
  label: string
  description?: string | null
}
import type { useSensors } from '@dnd-kit/core'
import { CardSortHeader } from './card-sort-header'
import { CardSortFooter } from './card-sort-footer'
import { InstructionsModal, ValidationErrorDialog, DeleteCategoryDialog } from './modals'
import { RecordingOverlays } from './recording-overlays'

interface DesktopSortingViewProps {
  // Cards
  cards: CardWithImage[]
  availableCards: CardWithImage[]
  activeId: string | null
  activeCard: CardWithImage | null

  // Categories
  allCategories: CategoryItem[]
  customCategories: { id: string; label: string }[]
  canCreateCategory: boolean
  hoveredCategoryId: string | null
  collapsedCategories: Set<string>
  onToggleCollapse: (categoryId: string) => void
  getCardsInCategory: (categoryId: string) => CardWithImage[]

  // Category editing
  editingCategoryId: string | null
  editingCategoryName: string
  onStartEditCategory: (id: string, label: string) => void
  onSaveEditCategory: () => void
  onCancelEditCategory: () => void
  onEditChange: (name: string) => void
  onDeleteCategory: (id: string) => void

  // New category form
  showNewCategoryForm: boolean
  newCategoryName: string
  onSetShowNewCategoryForm: (show: boolean) => void
  onSetNewCategoryName: (name: string) => void
  onCreateCategory: () => void

  // DnD
  sensors: ReturnType<typeof useSensors>
  onDragStart: (event: DragStartEvent) => void
  onDragOver: (event: DragOverEvent) => void
  onDragEnd: (event: DragEndEvent) => void

  // Settings
  settings: ExtendedCardSortSettings

  // Submit
  onSubmitClick: () => void
  canSubmit: boolean
  submitDisabledReason: string | undefined
  finishedButtonText: string
  unnamedCategoriesCount: number

  // Instructions
  instructions?: { title?: string; part1?: string; part2?: string }
  showInstructionsModal: boolean
  onSetShowInstructionsModal: (show: boolean) => void
  fallbackInstructions?: string

  // Validation
  validationError: string | null
  onClearValidationError: () => void

  // Delete category dialog
  categoryToDelete: string | null
  onSetCategoryToDelete: (id: string | null) => void
  onConfirmDeleteCategory: () => void

  // Recording
  recording?: RecordingProps
  recordingError: string | null
  thinkAloudEnabled: boolean
  audioLevel: number
  isSpeaking: boolean
  showPrompt: boolean
  currentPrompt: string
  dismissPrompt: () => void
  promptPosition?: ThinkAloudPromptPosition

  // Layout
  previewBanner?: React.ReactNode
}

export function DesktopSortingView({
  cards,
  availableCards,
  activeId,
  activeCard,
  allCategories,
  customCategories,
  canCreateCategory,
  hoveredCategoryId,
  collapsedCategories,
  onToggleCollapse,
  getCardsInCategory,
  editingCategoryId,
  editingCategoryName,
  onStartEditCategory,
  onSaveEditCategory,
  onCancelEditCategory,
  onEditChange,
  onDeleteCategory,
  showNewCategoryForm,
  newCategoryName,
  onSetShowNewCategoryForm,
  onSetNewCategoryName,
  onCreateCategory,
  sensors,
  onDragStart,
  onDragOver,
  onDragEnd,
  settings,
  onSubmitClick,
  canSubmit,
  submitDisabledReason,
  finishedButtonText,
  unnamedCategoriesCount,
  instructions,
  showInstructionsModal,
  onSetShowInstructionsModal,
  fallbackInstructions,
  validationError,
  onClearValidationError,
  categoryToDelete,
  onSetCategoryToDelete,
  onConfirmDeleteCategory,
  recording,
  recordingError,
  thinkAloudEnabled,
  audioLevel,
  isSpeaking,
  showPrompt,
  currentPrompt,
  dismissPrompt,
  promptPosition,
  previewBanner,
}: DesktopSortingViewProps) {
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--style-page-bg)' }}>
        {previewBanner}

        <CardSortHeader
          hasInstructions={Boolean(instructions)}
          onShowInstructions={() => onSetShowInstructionsModal(true)}
          onSubmit={onSubmitClick}
          submitDisabled={!canSubmit}
          finishedButtonText={finishedButtonText}
          submitDisabledReason={submitDisabledReason}
          recording={recording}
        />

        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Cards stack sidebar */}
          <div
            className="lg:w-96 xl:w-[420px] lg:border-r p-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-auto"
            style={{
              backgroundColor: 'var(--style-card-bg)',
              borderColor: 'var(--style-card-border)',
            }}
          >
            <h2 className="font-semibold text-lg mb-4">Cards to Sort</h2>
            <ScrollArea className="lg:h-[calc(100vh-180px)]">
              <DroppableCardsArea>
                <SortableContext items={availableCards.map((c) => c.id)} strategy={rectSortingStrategy}>
                  <div className="space-y-3 pr-2">
                    {availableCards.map((card) => (
                      <DraggableCard
                        key={card.id}
                        card={card}
                        isDragging={activeId === card.id}
                        settings={settings}
                      />
                    ))}
                  </div>
                </SortableContext>
                {availableCards.length === 0 && (
                  <div
                    className="text-center py-8 border-2 border-dashed rounded-lg"
                    style={{
                      borderColor: 'var(--brand-muted)',
                      backgroundColor: 'var(--brand-subtle)',
                    }}
                  >
                    <Check className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--brand)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--brand)' }}>All cards sorted!</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--brand)' }}>
                      Click &quot;{finishedButtonText}&quot; when you&apos;re ready to submit.
                    </p>
                  </div>
                )}
              </DroppableCardsArea>
            </ScrollArea>
          </div>

          {/* Categories area */}
          <div className="flex-1 p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Categories</h2>
              {canCreateCategory && (
                <Button variant="outline" onClick={() => onSetShowNewCategoryForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Category
                </Button>
              )}
            </div>

            {showNewCategoryForm && (
              <div
                className="flex flex-col sm:flex-row gap-2 mb-6 p-4 rounded-lg shadow-sm"
                style={{
                  backgroundColor: 'var(--style-card-bg)',
                  border: '1px solid var(--style-card-border)',
                }}
              >
                <Input
                  placeholder="Enter category name..."
                  value={newCategoryName}
                  onChange={(e) => onSetNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onCreateCategory()}
                  autoFocus
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button onClick={onCreateCategory}>Create</Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      onSetShowNewCategoryForm(false)
                      onSetNewCategoryName('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {allCategories.map((category) => {
                const isCustom = customCategories.some((c) => c.id === category.id)
                const isUnclearCategory = category.id === '__unclear__'
                return (
                  <DroppableCategory
                    key={category.id}
                    category={category}
                    cards={getCardsInCategory(category.id)}
                    isCustom={isCustom}
                    isEditing={editingCategoryId === category.id}
                    editValue={editingCategoryId === category.id ? editingCategoryName : ''}
                    onStartEdit={() => onStartEditCategory(category.id, category.label)}
                    onCancelEdit={onCancelEditCategory}
                    onSaveEdit={onSaveEditCategory}
                    onEditChange={onEditChange}
                    onDelete={() => onDeleteCategory(category.id)}
                    isCollapsed={collapsedCategories.has(category.id)}
                    onToggleCollapse={() => onToggleCollapse(category.id)}
                    isHovered={hoveredCategoryId === category.id}
                    showDescription={settings.showCategoryDescriptions}
                    isUnclear={isUnclearCategory}
                  />
                )
              })}

              {canCreateCategory && (
                <NewGroupDropZone />
              )}
            </div>
          </div>
        </div>

        <CardSortFooter
          remainingCards={availableCards.length}
          totalCards={cards.length}
          finishedButtonText={finishedButtonText}
          showProgress={settings.showProgress ?? true}
          unnamedCategoriesCount={unnamedCategoriesCount}
        />
      </div>

      <DragOverlay>
        {activeCard && <CardOverlay card={activeCard} settings={settings} />}
      </DragOverlay>

      <InstructionsModal
        open={showInstructionsModal}
        onOpenChange={onSetShowInstructionsModal}
        instructions={instructions}
        fallbackInstructions={fallbackInstructions}
        finishedButtonText={finishedButtonText}
      />

      <ValidationErrorDialog
        error={validationError}
        onClose={onClearValidationError}
      />

      <DeleteCategoryDialog
        categoryId={categoryToDelete}
        onClose={() => onSetCategoryToDelete(null)}
        onConfirm={onConfirmDeleteCategory}
      />

      <RecordingOverlays
        isRecording={recording?.isRecording ?? false}
        isPaused={recording?.isPaused ?? false}
        isUploading={recording?.isUploading ?? false}
        uploadProgress={recording?.uploadProgress ?? 0}
        recordingError={recordingError}
        thinkAloudEnabled={thinkAloudEnabled}
        audioLevel={audioLevel}
        isSpeaking={isSpeaking}
        showPrompt={showPrompt}
        currentPrompt={currentPrompt}
        dismissPrompt={dismissPrompt}
        promptPosition={promptPosition}
      />
    </DndContext>
  )
}
