'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Check, X, Plus, FolderOpen, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import type { CardWithImage, CardSortSettings } from '@veritio/study-types'

interface PlacedCard {
  cardId: string
  categoryId: string
}

interface Category {
  id: string
  label: string
  description?: string | null
}

interface MobileCardSortViewProps {
  cards: CardWithImage[]
  allCategories: Category[]
  placedCards: PlacedCard[]
  setPlacedCards: React.Dispatch<React.SetStateAction<PlacedCard[]>>
  settings: CardSortSettings & { requireAllCardsSorted?: boolean; requireCategoriesNamed?: boolean }
  customCategories: Category[]
  newCategoryName: string
  setNewCategoryName: (v: string) => void
  showNewCategoryForm: boolean
  setShowNewCategoryForm: (v: boolean) => void
  handleCreateCategory: () => void
  /** Create a category with the given name and return its ID (for inline sheet creation) */
  onCreateCategoryWithName?: (name: string) => string
  editingCategoryId: string | null
  editingCategoryName: string
  setEditingCategoryName: (v: string) => void
  handleStartEditCategory: (id: string, label: string) => void
  handleSaveEditCategory: () => void
  handleCancelEditCategory: () => void
  handleDeleteCategory: (id: string) => void
}

const UNCLEAR_CATEGORY_ID = '__unclear__'

interface SortToast {
  cardLabel: string
  categoryLabel: string
  id: number
}

export function MobileCardSortView({
  cards,
  allCategories,
  placedCards,
  setPlacedCards,
  settings,
  customCategories,
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
}: MobileCardSortViewProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [categoriesExpanded, setCategoriesExpanded] = useState(false)
  const [sheetNewCategoryMode, setSheetNewCategoryMode] = useState(false)
  const [sheetNewCategoryName, setSheetNewCategoryName] = useState('')
  const [sortToast, setSortToast] = useState<SortToast | null>(null)
  const [lastSortedCardId, setLastSortedCardId] = useState<string | null>(null)
  const toastCounter = useRef(0)

  const selectedCard = selectedCardId ? cards.find((c) => c.id === selectedCardId) : null
  const currentPlacement = selectedCardId
    ? placedCards.find((p) => p.cardId === selectedCardId)
    : null

  // Auto-dismiss toast after 2s
  useEffect(() => {
    if (!sortToast) return
    const timer = setTimeout(() => setSortToast(null), 2000)
    return () => clearTimeout(timer)
  }, [sortToast])

  // Clear last sorted highlight after animation
  useEffect(() => {
    if (!lastSortedCardId) return
    const timer = setTimeout(() => setLastSortedCardId(null), 800)
    return () => clearTimeout(timer)
  }, [lastSortedCardId])

  const assignCard = useCallback((cardId: string, categoryId: string) => {
    const card = cards.find((c) => c.id === cardId)
    const cat = allCategories.find((c) => c.id === categoryId)

    setPlacedCards((prev) => {
      const filtered = prev.filter((p) => p.cardId !== cardId)
      return [...filtered, { cardId, categoryId }]
    })
    setSelectedCardId(null)
    setLastSortedCardId(cardId)

    // Show toast feedback
    if (card && cat) {
      toastCounter.current += 1
      setSortToast({
        cardLabel: card.label,
        categoryLabel: cat.label || 'New category',
        id: toastCounter.current,
      })
    }
  }, [cards, allCategories, setPlacedCards])

  const unassignCard = (cardId: string) => {
    setPlacedCards((prev) => prev.filter((p) => p.cardId !== cardId))
    setSelectedCardId(null)
  }

  const getCategoryForCard = (cardId: string) => {
    const placement = placedCards.find((p) => p.cardId === cardId)
    if (!placement) return null
    return allCategories.find((c) => c.id === placement.categoryId) ?? null
  }

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      const aPlaced = placedCards.some((p) => p.cardId === a.id)
      const bPlaced = placedCards.some((p) => p.cardId === b.id)
      if (aPlaced === bPlaced) return 0
      return aPlaced ? 1 : -1
    })
  }, [cards, placedCards])

  const canCreateCategory = settings.mode === 'open' || settings.mode === 'hybrid'

  // Create category from within the sheet, then assign the card to it
  const handleSheetCreateCategory = () => {
    const name = sheetNewCategoryName.trim()
    if (!name || !selectedCardId) return
    if (onCreateCategoryWithName) {
      const newCategoryId = onCreateCategoryWithName(name)
      assignCard(selectedCardId, newCategoryId)
    }
    setSheetNewCategoryMode(false)
    setSheetNewCategoryName('')
  }

  const categoriesWithCounts = useMemo(() => {
    return allCategories.map((cat) => ({
      ...cat,
      count: placedCards.filter((p) => p.categoryId === cat.id).length,
    }))
  }, [allCategories, placedCards])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <AnimatePresence>
        {sortToast && (
          <motion.div
            key={sortToast.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute top-2 left-4 right-4 z-50 pointer-events-none"
          >
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg mx-auto max-w-sm"
              style={{ backgroundColor: 'var(--brand)', color: 'var(--brand-foreground, #fff)' }}
            >
              <Check className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium truncate">
                Sorted to {sortToast.categoryLabel}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable main area */}
      <div className="flex-1 overflow-y-auto">
        {/* Compact category summary strip */}
        {allCategories.length > 0 && (
          <div className="px-4 pt-3 pb-1">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categoriesWithCounts.map((cat) => {
                const isUnclear = cat.id === UNCLEAR_CATEGORY_ID
                return (
                  <button
                    key={cat.id}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: cat.count > 0 ? 'var(--brand-subtle)' : 'var(--style-bg-muted)',
                      color: cat.count > 0 ? 'var(--brand)' : 'var(--style-text-muted)',
                      border: `1px solid ${cat.count > 0 ? 'var(--brand-light)' : 'var(--style-card-border)'}`,
                    }}
                    onClick={() => setCategoriesExpanded(true)}
                  >
                    {isUnclear ? (
                      <HelpCircle className="h-3 w-3" />
                    ) : (
                      <FolderOpen className="h-3 w-3" />
                    )}
                    <span className="truncate max-w-[100px]">{cat.label || 'Unnamed'}</span>
                    <span
                      className="shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[12px] font-bold"
                      style={{
                        backgroundColor: cat.count > 0 ? 'var(--brand)' : 'var(--style-card-border)',
                        color: cat.count > 0 ? 'var(--brand-foreground, #fff)' : 'var(--style-text-muted)',
                      }}
                    >
                      {cat.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Cards section */}
        <div className="p-4 pt-2">
          <h2 className="font-semibold text-base mb-3" style={{ color: 'var(--style-text-primary)' }}>
            Cards to Sort
          </h2>
          <LayoutGroup>
            <div className="space-y-2">
              {sortedCards.map((card) => {
                const category = getCategoryForCard(card.id)
                const isSelected = selectedCardId === card.id
                const isSorted = !!category
                const justSorted = lastSortedCardId === card.id

                return (
                  <motion.button
                    key={card.id}
                    layout
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    className="w-full text-left rounded-xl border-2 transition-colors active:scale-[0.98]"
                    style={{
                      borderColor: (justSorted || isSelected) ? 'var(--brand)' : 'var(--style-card-border)',
                      backgroundColor: (justSorted || isSelected) ? 'var(--brand-subtle)' : 'var(--style-card-bg)',
                    }}
                    onClick={() => setSelectedCardId(isSelected ? null : card.id)}
                  >
                    <div className="flex items-center gap-3 p-3">
                      <div
                        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-300"
                        style={{
                          backgroundColor: isSorted ? 'var(--brand)' : 'var(--style-bg-muted)',
                        }}
                      >
                        {isSorted ? (
                          <motion.div
                            initial={justSorted ? { scale: 0 } : false}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                          >
                            <Check className="w-3.5 h-3.5 text-brand-foreground" />
                          </motion.div>
                        ) : (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: 'var(--style-text-muted)' }}
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className="font-medium text-sm truncate"
                          style={{ color: 'var(--style-text-primary)' }}
                        >
                          {card.label}
                        </p>
                        {(settings.showCardDescriptions ?? true) && card.description && (
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: 'var(--style-text-secondary)' }}
                          >
                            {card.description}
                          </p>
                        )}
                      </div>

                      {category ? (
                        <motion.span
                          initial={justSorted ? { scale: 0.5, opacity: 0 } : false}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                          className="shrink-0 text-xs px-2 py-1 rounded-full font-medium"
                          style={{
                            backgroundColor: 'var(--brand-muted)',
                            color: 'var(--style-text-primary)',
                          }}
                        >
                          {category.label}
                        </motion.span>
                      ) : (
                        <span
                          className="shrink-0 text-xs"
                          style={{ color: 'var(--style-text-muted)' }}
                        >
                          Tap to sort
                        </span>
                      )}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </LayoutGroup>
        </div>

        {/* Categories overview section (collapsible) */}
        <div
          className="mx-4 mb-4 rounded-xl border overflow-hidden"
          style={{
            borderColor: 'var(--style-card-border)',
            backgroundColor: 'var(--style-card-bg)',
          }}
        >
          <button
            className="w-full flex items-center justify-between p-4"
            onClick={() => setCategoriesExpanded((v) => !v)}
          >
            <span className="font-semibold text-base" style={{ color: 'var(--style-text-primary)' }}>
              Categories ({allCategories.length})
            </span>
            {categoriesExpanded ? (
              <ChevronUp className="h-4 w-4" style={{ color: 'var(--style-text-secondary)' }} />
            ) : (
              <ChevronDown className="h-4 w-4" style={{ color: 'var(--style-text-secondary)' }} />
            )}
          </button>

          {categoriesExpanded && (
            <div className="border-t" style={{ borderColor: 'var(--style-card-border)' }}>
              {allCategories.map((cat) => {
                const count = placedCards.filter((p) => p.categoryId === cat.id).length
                const isUnclear = cat.id === UNCLEAR_CATEGORY_ID
                const isCustom = customCategories.some((c) => c.id === cat.id)
                const needsNaming = isCustom && !cat.label.trim()

                if (editingCategoryId === cat.id) {
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center gap-2 px-4 py-3 border-t"
                      style={{ borderColor: 'var(--style-card-border)' }}
                    >
                      <Input
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEditCategory()
                          if (e.key === 'Escape') handleCancelEditCategory()
                        }}
                        onBlur={handleSaveEditCategory}
                        placeholder="Category name..."
                        className="h-8 text-sm flex-1"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={handleSaveEditCategory} className="h-8 px-2">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onMouseDown={(e) => { e.preventDefault(); handleCancelEditCategory() }}
                        className="h-8 px-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                }

                return (
                  <div
                    key={cat.id}
                    className="flex items-center gap-3 px-4 py-3 border-t"
                    style={{ borderColor: 'var(--style-card-border)' }}
                  >
                    {isUnclear ? (
                      <HelpCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--warning-color, #f59e0b)' }} />
                    ) : (
                      <FolderOpen className="h-4 w-4 shrink-0" style={{ color: 'var(--style-text-secondary)' }} />
                    )}
                    <span
                      className="flex-1 text-sm font-medium"
                      style={{ color: needsNaming ? 'var(--warning-color, #ea580c)' : 'var(--style-text-primary)' }}
                    >
                      {needsNaming ? 'Unnamed group' : cat.label}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'var(--style-bg-muted)', color: 'var(--style-text-secondary)' }}
                    >
                      {count}
                    </span>
                    {isCustom && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStartEditCategory(cat.id, cat.label)}
                          className="h-7 px-2 text-xs"
                          style={{ color: 'var(--style-text-muted)' }}
                        >
                          Rename
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="h-7 px-2 text-xs"
                          style={{ color: 'var(--style-text-muted)' }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* New category form */}
              {canCreateCategory && showNewCategoryForm && (
                <div
                  className="px-4 py-3 border-t space-y-2"
                  style={{ borderColor: 'var(--style-card-border)' }}
                >
                  <Input
                    placeholder="Enter category name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>
                      Create
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setShowNewCategoryForm(false); setNewCategoryName('') }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {canCreateCategory && !showNewCategoryForm && (
                <button
                  className="w-full flex items-center gap-2 px-4 py-3 border-t text-sm transition-colors"
                  style={{
                    borderColor: 'var(--style-card-border)',
                    color: 'var(--style-text-secondary)',
                  }}
                  onClick={() => { setShowNewCategoryForm(true); setCategoriesExpanded(true) }}
                >
                  <Plus className="h-4 w-4" />
                  New Category
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category picker bottom sheet - shown when a card is selected */}
      <Sheet open={!!selectedCardId} onOpenChange={(open) => { if (!open) { setSelectedCardId(null); setSheetNewCategoryMode(false); setSheetNewCategoryName('') } }}>
        <SheetContent
          side="bottom"
          className="p-0 flex flex-col border-0 rounded-t-2xl [&>button:last-child]:hidden"
          style={{
            backgroundColor: 'var(--style-card-bg)',
            maxHeight: '75vh',
          }}
        >
          <SheetTitle className="sr-only">
            {selectedCard ? `Sort card: ${selectedCard.label}` : 'Sort card'}
          </SheetTitle>

          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div
              className="w-10 h-1 rounded-full"
              style={{ backgroundColor: 'var(--style-card-border)' }}
            />
          </div>

          <div
            className="flex items-center justify-between px-4 pb-3 pt-1 border-b shrink-0"
            style={{ borderColor: 'var(--style-card-border)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs mb-0.5" style={{ color: 'var(--style-text-secondary)' }}>
                Sorting card
              </p>
              <p
                className="font-semibold text-base truncate"
                style={{ color: 'var(--style-text-primary)' }}
              >
                {selectedCard?.label}
              </p>
            </div>
            <button
              onClick={() => setSelectedCardId(null)}
              className="shrink-0 ml-3 p-2 rounded-full"
              style={{ backgroundColor: 'var(--style-bg-muted)' }}
            >
              <X className="h-4 w-4" style={{ color: 'var(--style-text-secondary)' }} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-3 space-y-2">
            {allCategories.map((cat) => {
              const isCurrentCat = currentPlacement?.categoryId === cat.id
              const isUnclear = cat.id === UNCLEAR_CATEGORY_ID
              const needsNaming = customCategories.some((c) => c.id === cat.id) && !cat.label.trim()

              return (
                <button
                  key={cat.id}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98]"
                  style={{
                    borderColor: isCurrentCat ? 'var(--brand)' : 'var(--style-card-border)',
                    backgroundColor: isCurrentCat ? 'var(--brand-subtle)' : 'transparent',
                  }}
                  onClick={() => assignCard(selectedCardId!, cat.id)}
                >
                  {isUnclear ? (
                    <HelpCircle
                      className="h-5 w-5 shrink-0"
                      style={{ color: 'var(--warning-color, #f59e0b)' }}
                    />
                  ) : (
                    <FolderOpen
                      className="h-5 w-5 shrink-0"
                      style={{ color: isCurrentCat ? 'var(--brand)' : 'var(--style-text-secondary)' }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-medium text-sm"
                      style={{
                        color: needsNaming
                          ? 'var(--warning-color, #ea580c)'
                          : 'var(--style-text-primary)',
                      }}
                    >
                      {needsNaming ? 'Unnamed group' : cat.label}
                    </p>
                    {(settings.showCategoryDescriptions ?? false) && cat.description && (
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: 'var(--style-text-secondary)' }}
                      >
                        {cat.description}
                      </p>
                    )}
                  </div>
                  {isCurrentCat && (
                    <Check className="h-5 w-5 shrink-0" style={{ color: 'var(--brand)' }} />
                  )}
                </button>
              )
            })}

            {currentPlacement && (
              <button
                className="w-full p-4 rounded-xl border text-sm text-center transition-colors active:scale-[0.98]"
                style={{
                  borderColor: 'var(--style-card-border)',
                  color: 'var(--style-text-secondary)',
                }}
                onClick={() => unassignCard(selectedCardId!)}
              >
                Remove from category
              </button>
            )}
          </div>

          {/* New category section inside sheet (for open/hybrid) */}
          {canCreateCategory && (
            <div
              className="p-4 border-t shrink-0"
              style={{ borderColor: 'var(--style-card-border)' }}
            >
              {sheetNewCategoryMode ? (
                <div className="space-y-3">
                  <Input
                    placeholder="Enter category name..."
                    value={sheetNewCategoryName}
                    onChange={(e) => setSheetNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSheetCreateCategory()}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-brand hover:bg-brand-hover text-brand-foreground"
                      onClick={handleSheetCreateCategory}
                      disabled={!sheetNewCategoryName.trim()}
                    >
                      Create & Assign
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { setSheetNewCategoryMode(false); setSheetNewCategoryName('') }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  className="w-full bg-brand hover:bg-brand-hover text-brand-foreground"
                  onClick={() => setSheetNewCategoryMode(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Category
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
