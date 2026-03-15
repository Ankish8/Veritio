'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Folder, HelpCircle } from 'lucide-react'
import type { StandardizationMapping } from '@/lib/algorithms/category-standardization'
import { useSorting } from '@/hooks/use-sorting'
import {
  useCategoryAnalysis,
  useStandardization,
  StandardizedCategoryEditor,
  CategoryRow,
  CategoriesActionBar,
  CategoriesTableHeader,
  type EnhancedCategoryAnalysis,
  type CategorySortColumn,
} from './categories'

interface CategoriesTabProps {
  categories: Array<{ id: string; label: string; description?: string | null }>
  cards: Array<{ id: string; label: string; description?: string | null }>
  responses: Array<{
    participant_id: string
    card_placements: Record<string, string> | unknown
    custom_categories?: unknown
  }>
  mode: 'open' | 'closed' | 'hybrid'
  headerActions?: React.ReactNode
  standardizations?: StandardizationMapping[]
  onStandardizationsChange?: (standardizations: StandardizationMapping[]) => void
}

const DEFAULT_CARDS_SHOWN = 4

export const CategoriesTab = memo(function CategoriesTab({
  categories,
  cards,
  responses,
  mode: _mode,
  headerActions,
  standardizations = [],
  onStandardizationsChange,
}: CategoriesTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const categoryAnalyses = useCategoryAnalysis({
    categories,
    cards,
    responses,
    standardizations,
  })

  const standardization = useStandardization({
    responses,
    categoryAnalyses,
    standardizations,
    onStandardizationsChange,
  })

  const filteredAnalyses = useMemo(() => {
    if (!searchQuery.trim()) return categoryAnalyses
    const query = searchQuery.toLowerCase()
    return categoryAnalyses.filter(
      analysis =>
        analysis.categoryName.toLowerCase().includes(query) ||
        analysis.cards.some(card => card.cardLabel.toLowerCase().includes(query))
    )
  }, [categoryAnalyses, searchQuery])

  const comparators = useMemo(() => ({
    category: (a: EnhancedCategoryAnalysis, b: EnhancedCategoryAnalysis) =>
      a.categoryName.localeCompare(b.categoryName),
    contains: (a: EnhancedCategoryAnalysis, b: EnhancedCategoryAnalysis) =>
      a.uniqueCardCount - b.uniqueCardCount,
    frequency: (a: EnhancedCategoryAnalysis, b: EnhancedCategoryAnalysis) =>
      (a.cards[0]?.frequency || 0) - (b.cards[0]?.frequency || 0),
    avgPos: (a: EnhancedCategoryAnalysis, b: EnhancedCategoryAnalysis) =>
      (a.cards[0]?.averagePosition || 0) - (b.cards[0]?.averagePosition || 0),
    createdBy: (a: EnhancedCategoryAnalysis, b: EnhancedCategoryAnalysis) =>
      a.createdByCount - b.createdByCount,
    agreement: (a: EnhancedCategoryAnalysis, b: EnhancedCategoryAnalysis) =>
      (a.agreementScore ?? -1) - (b.agreementScore ?? -1),
  }), [])

  const { sortedData: sortedAnalyses, sortConfig, toggleSort } = useSorting<
    EnhancedCategoryAnalysis,
    CategorySortColumn
  >(filteredAnalyses, {
    initialSort: { key: 'category', direction: 'asc' },
    comparators,
  })

  const toggleCategoryExpansion = useCallback((categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryName)) newSet.delete(categoryName)
      else newSet.add(categoryName)
      return newSet
    })
  }, [])

  const toggleExpandAll = useCallback(() => {
    const expandableCategories = sortedAnalyses.filter(a => a.cards.length > DEFAULT_CARDS_SHOWN)
    const allExpanded = expandableCategories.every(a => expandedCategories.has(a.categoryName))

    if (allExpanded) {
      setExpandedCategories(new Set())
    } else {
      setExpandedCategories(new Set(expandableCategories.map(a => a.categoryName)))
    }
  }, [sortedAnalyses, expandedCategories])

  const showExpandToggle = sortedAnalyses.some(a => a.cards.length > DEFAULT_CARDS_SHOWN)
  const allExpanded = showExpandToggle &&
    sortedAnalyses
      .filter(a => a.cards.length > DEFAULT_CARDS_SHOWN)
      .every(a => expandedCategories.has(a.categoryName))
  const allSelected = sortedAnalyses.length > 0 &&
    standardization.selectedCategories.size === sortedAnalyses.length

  if (categoryAnalyses.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No categories found for this study.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Your categories</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs">
                  Categories created by participants. Select similar categories and click
                  "Standardize" to merge them.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-4">{headerActions}</div>
      </div>

      <CategoriesActionBar
        selectedCount={standardization.selectedCategories.size}
        hasSelectedStandardized={standardization.hasSelectedStandardized}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onStandardize={standardization.handleStandardize}
        onUnstandardize={standardization.handleUnstandardize}
      />

      <div className="rounded-lg overflow-x-auto">
        <Table className="w-full" style={{ tableLayout: 'fixed' }}>
          <CategoriesTableHeader
            allSelected={allSelected}
            onSelectAll={(checked) => standardization.handleSelectAll(checked, sortedAnalyses)}
            sortColumn={sortConfig?.key ?? null}
            sortDirection={sortConfig?.direction ?? null}
            onSort={toggleSort}
            showExpandToggle={showExpandToggle}
            allExpanded={allExpanded}
            onToggleExpandAll={toggleExpandAll}
          />
          <TableBody>
            {sortedAnalyses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  {searchQuery ? 'No categories match your search.' : 'No categories to display.'}
                </TableCell>
              </TableRow>
            ) : (
              sortedAnalyses.map((analysis, idx) => (
                <CategoryRow
                  key={analysis.categoryName}
                  analysis={analysis}
                  isExpanded={expandedCategories.has(analysis.categoryName)}
                  onToggleExpand={() => toggleCategoryExpansion(analysis.categoryName)}
                  maxCardsDefault={DEFAULT_CARDS_SHOWN}
                  isSelected={standardization.selectedCategories.has(analysis.categoryName)}
                  onSelect={checked => standardization.handleSelectCategory(analysis.categoryName, checked)}
                  onEdit={() => standardization.openEditor(analysis)}
                  isLast={idx === sortedAnalyses.length - 1}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end text-sm text-muted-foreground">
        Showing 1 to {sortedAnalyses.length} of {categoryAnalyses.length} categories
      </div>

      <StandardizedCategoryEditor
        open={standardization.editorOpen}
        onOpenChange={(open) => !open && standardization.closeEditor()}
        category={standardization.editingCategory}
        allCategories={categoryAnalyses}
        onSave={standardization.handleSaveCategory}
        onUnstandardizeAll={standardization.handleUnstandardizeFromEditor}
      />
    </div>
  )
})
