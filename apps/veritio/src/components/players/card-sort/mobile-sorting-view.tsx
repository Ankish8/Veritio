'use client'

import type { CardWithImage } from '@veritio/study-types'
import type { ExtendedCardSortSettings, PlacedCard, RecordingProps } from './card-sort-types'
import type { ThinkAloudPromptPosition } from '@/components/builders/shared/types'

interface CategoryItem {
  id: string
  label: string
  description?: string | null
}
import { MobileCardSortView } from './mobile-card-sort-view'
import { CardSortHeader } from './card-sort-header'
import { CardSortFooter } from './card-sort-footer'
import { InstructionsModal, ValidationErrorDialog, DeleteCategoryDialog } from './modals'
import { RecordingOverlays } from './recording-overlays'

interface MobileSortingViewProps {
  // Cards
  cards: CardWithImage[]
  availableCards: CardWithImage[]

  // Categories
  allCategories: CategoryItem[]
  customCategories: { id: string; label: string }[]
  placedCards: PlacedCard[]
  setPlacedCards: React.Dispatch<React.SetStateAction<PlacedCard[]>>

  // Category management
  newCategoryName: string
  setNewCategoryName: (name: string) => void
  showNewCategoryForm: boolean
  setShowNewCategoryForm: (show: boolean) => void
  handleCreateCategory: () => void
  onCreateCategoryWithName: (name: string) => string
  editingCategoryId: string | null
  editingCategoryName: string
  setEditingCategoryName: (name: string) => void
  handleStartEditCategory: (id: string, label: string) => void
  handleSaveEditCategory: () => void
  handleCancelEditCategory: () => void
  handleDeleteCategory: (id: string) => void

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

export function MobileSortingView({
  cards,
  availableCards,
  allCategories,
  customCategories,
  placedCards,
  setPlacedCards,
  newCategoryName,
  setNewCategoryName,
  showNewCategoryForm,
  setShowNewCategoryForm,
  handleCreateCategory,
  onCreateCategoryWithName,
  editingCategoryId,
  editingCategoryName,
  setEditingCategoryName,
  handleStartEditCategory,
  handleSaveEditCategory,
  handleCancelEditCategory,
  handleDeleteCategory,
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
}: MobileSortingViewProps) {
  return (
    <div className="flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--style-page-bg)', height: '100dvh' }}>
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

      <MobileCardSortView
        cards={cards}
        allCategories={allCategories}
        placedCards={placedCards}
        setPlacedCards={setPlacedCards}
        settings={settings}
        customCategories={customCategories}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        showNewCategoryForm={showNewCategoryForm}
        setShowNewCategoryForm={setShowNewCategoryForm}
        handleCreateCategory={handleCreateCategory}
        onCreateCategoryWithName={onCreateCategoryWithName}
        editingCategoryId={editingCategoryId}
        editingCategoryName={editingCategoryName}
        setEditingCategoryName={setEditingCategoryName}
        handleStartEditCategory={handleStartEditCategory}
        handleSaveEditCategory={handleSaveEditCategory}
        handleCancelEditCategory={handleCancelEditCategory}
        handleDeleteCategory={handleDeleteCategory}
      />

      <CardSortFooter
        remainingCards={availableCards.length}
        totalCards={cards.length}
        finishedButtonText={finishedButtonText}
        showProgress={settings.showProgress ?? true}
        unnamedCategoriesCount={unnamedCategoriesCount}
      />

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
    </div>
  )
}
