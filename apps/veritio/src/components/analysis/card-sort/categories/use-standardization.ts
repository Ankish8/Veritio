'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  extractCategories,
  analyzeCategories,
  calculateAgreementScore,
  type StandardizationMapping,
} from '@/lib/algorithms/category-standardization'
import type { EnhancedCategoryAnalysis } from './use-category-analysis'

interface UseStandardizationOptions {
  responses: Array<{
    participant_id: string
    card_placements: Record<string, string> | unknown
    custom_categories?: unknown
  }>
  categoryAnalyses: EnhancedCategoryAnalysis[]
  standardizations: StandardizationMapping[]
  onStandardizationsChange?: (standardizations: StandardizationMapping[]) => void
}

export function useStandardization({
  responses,
  categoryAnalyses,
  standardizations,
  onStandardizationsChange,
}: UseStandardizationOptions) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [editingCategory, setEditingCategory] = useState<EnhancedCategoryAnalysis | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  const getParticipantCategories = useCallback(() => {
    return extractCategories(
      responses.map(r => ({
        participant_id: r.participant_id,
        card_placements: (r.card_placements || {}) as Record<string, string>,
        custom_categories: r.custom_categories as Array<{ id: string; label: string }> | null,
      }))
    )
  }, [responses])

  const handleSelectCategory = useCallback((categoryName: string, checked: boolean) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev)
      if (checked) newSet.add(categoryName)
      else newSet.delete(categoryName)
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback((checked: boolean, allCategories: EnhancedCategoryAnalysis[]) => {
    setSelectedCategories(checked ? new Set(allCategories.map(a => a.categoryName)) : new Set())
  }, [])

  const handleStandardize = useCallback(() => {
    if (selectedCategories.size < 2) return

    const selectedNames = Array.from(selectedCategories)
    const selectedAnalyses = categoryAnalyses.filter(a => selectedCategories.has(a.categoryName))
    const mostFrequent = selectedAnalyses.reduce((best, current) =>
      current.createdByCount > best.createdByCount ? current : best
    )

    const participantCategories = getParticipantCategories()
    const relevantCategories = analyzeCategories(participantCategories).filter(cat =>
      selectedNames.includes(cat.name)
    )
    const agreementScore = calculateAgreementScore(relevantCategories)

    const newStandardization: StandardizationMapping = {
      standardizedName: mostFrequent.categoryName,
      originalNames: selectedNames,
      agreementScore,
    }

    const updatedStandardizations = standardizations.filter(
      s => !s.originalNames.some(name => selectedNames.includes(name))
    )

    onStandardizationsChange?.([...updatedStandardizations, newStandardization])
    setSelectedCategories(new Set())
  }, [selectedCategories, categoryAnalyses, getParticipantCategories, standardizations, onStandardizationsChange])

  const handleUnstandardize = useCallback(() => {
    if (selectedCategories.size === 0) return
    const selectedNames = Array.from(selectedCategories)
    const updatedStandardizations = standardizations.filter(
      s => !selectedNames.includes(s.standardizedName)
    )
    onStandardizationsChange?.(updatedStandardizations)
    setSelectedCategories(new Set())
  }, [selectedCategories, standardizations, onStandardizationsChange])

  const handleSaveCategory = useCallback(
    (updatedName: string, includedCategories: string[]) => {
      if (!editingCategory) return

      const participantCategories = getParticipantCategories()
      const relevantCategories = analyzeCategories(participantCategories).filter(cat =>
        includedCategories.includes(cat.name)
      )
      const agreementScore = calculateAgreementScore(relevantCategories)

      if (editingCategory.isStandardized) {
        const updatedStandardizations = standardizations.map(s =>
          s.standardizedName === editingCategory.categoryName
            ? { standardizedName: updatedName, originalNames: includedCategories, agreementScore }
            : s
        )
        onStandardizationsChange?.(updatedStandardizations)
      } else {
        onStandardizationsChange?.([
          ...standardizations,
          { standardizedName: updatedName, originalNames: includedCategories, agreementScore },
        ])
      }

      setEditorOpen(false)
      setEditingCategory(null)
    },
    [editingCategory, getParticipantCategories, standardizations, onStandardizationsChange]
  )

  const handleUnstandardizeFromEditor = useCallback(() => {
    if (!editingCategory?.isStandardized) return
    const updatedStandardizations = standardizations.filter(
      s => s.standardizedName !== editingCategory.categoryName
    )
    onStandardizationsChange?.(updatedStandardizations)
    setEditorOpen(false)
    setEditingCategory(null)
  }, [editingCategory, standardizations, onStandardizationsChange])

  const openEditor = useCallback((category: EnhancedCategoryAnalysis) => {
    setEditingCategory(category)
    setEditorOpen(true)
  }, [])

  const closeEditor = useCallback(() => {
    setEditorOpen(false)
    setEditingCategory(null)
  }, [])

  const hasSelectedStandardized = useMemo(() => {
    return categoryAnalyses.some(a => selectedCategories.has(a.categoryName) && a.isStandardized)
  }, [selectedCategories, categoryAnalyses])

  return {
    selectedCategories,
    handleSelectCategory,
    handleSelectAll,
    handleStandardize,
    handleUnstandardize,
    hasSelectedStandardized,
    editingCategory,
    editorOpen,
    openEditor,
    closeEditor,
    handleSaveCategory,
    handleUnstandardizeFromEditor,
  }
}
