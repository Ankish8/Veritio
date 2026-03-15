import { useMemo } from 'react'
import {
  extractCategories,
  analyzeCategories,
  type CategoryAnalysis as BaseCategoryAnalysis,
  type StandardizationMapping,
} from '@/lib/algorithms/category-standardization'

export interface EnhancedCategoryAnalysis {
  categoryName: string
  isStandardized: boolean
  standardizedGroup?: StandardizationMapping
  originalCategories: string[]
  uniqueCardCount: number
  cards: {
    cardId: string
    cardLabel: string
    frequency: number
    averagePosition: number
  }[]
  createdByCount: number
  agreementScore: number | null
}

type CardLookup = Array<{ id: string; label: string; description?: string | null }>

function toCardsList(
  cardMap: Map<string, { frequency: number; positions: number[] }>,
  cards: CardLookup,
) {
  return Array.from(cardMap.entries())
    .map(([cardId, data]) => {
      const card = cards.find(c => c.id === cardId)
      return {
        cardId,
        cardLabel: card?.label || cardId,
        frequency: data.frequency,
        averagePosition:
          data.positions.length > 0
            ? Number((data.positions.reduce((a, b) => a + b, 0) / data.positions.length).toFixed(1))
            : 1.0,
      }
    })
    .sort((a, b) => b.frequency - a.frequency)
}

interface UseCategoryAnalysisProps {
  categories: CardLookup
  cards: CardLookup
  responses: Array<{
    participant_id: string
    card_placements: Record<string, string> | unknown
    custom_categories?: unknown
  }>
  standardizations: StandardizationMapping[]
}

export function useCategoryAnalysis({
  categories: _categories,
  cards,
  responses,
  standardizations,
}: UseCategoryAnalysisProps): EnhancedCategoryAnalysis[] {
  return useMemo(() => {
    const participantCategories = extractCategories(
      responses.map(r => ({
        participant_id: r.participant_id,
        card_placements: (r.card_placements || {}) as Record<string, string>,
        custom_categories: r.custom_categories as Array<{ id: string; label: string }> | null,
      }))
    )

    const baseAnalyses = analyzeCategories(participantCategories)

    const standardizationLookup = new Map<string, StandardizationMapping>()
    for (const mapping of standardizations) {
      for (const originalName of mapping.originalNames) {
        standardizationLookup.set(originalName, mapping)
      }
    }

    const standardizedGroups = new Map<string, BaseCategoryAnalysis[]>()
    const standaloneCategories: BaseCategoryAnalysis[] = []

    for (const analysis of baseAnalyses) {
      const mapping = standardizationLookup.get(analysis.name)
      if (mapping) {
        const key = mapping.standardizedName
        if (!standardizedGroups.has(key)) {
          standardizedGroups.set(key, [])
        }
        standardizedGroups.get(key)!.push(analysis)
      } else {
        standaloneCategories.push(analysis)
      }
    }

    const result: EnhancedCategoryAnalysis[] = []

    for (const [standardizedName, groupCategories] of standardizedGroups) {
      const mapping = standardizations.find(s => s.standardizedName === standardizedName)!

      const cardMap = new Map<string, { frequency: number; positions: number[] }>()
      let totalCreators = 0

      for (const cat of groupCategories) {
        totalCreators += cat.frequency

        for (const response of responses) {
          const placements = (response.card_placements || {}) as Record<string, string>
          const cardPositions: Record<string, number> = {}
          let position = 1

          for (const [cardId, categoryName] of Object.entries(placements)) {
            if (categoryName === cat.name) {
              cardPositions[cardId] = position++
            }
          }

          for (const cardId of cat.cardIds) {
            const card = cards.find(c => c.id === cardId)
            if (card) {
              const existing = cardMap.get(cardId) || { frequency: 0, positions: [] }
              existing.frequency++
              if (cardPositions[cardId]) {
                existing.positions.push(cardPositions[cardId])
              }
              cardMap.set(cardId, existing)
            }
          }
        }
      }

      result.push({
        categoryName: standardizedName,
        isStandardized: true,
        standardizedGroup: mapping,
        originalCategories: mapping.originalNames,
        uniqueCardCount: cardMap.size,
        cards: toCardsList(cardMap, cards),
        createdByCount: totalCreators,
        agreementScore: mapping.agreementScore,
      })
    }

    for (const analysis of standaloneCategories) {
      const cardMap = new Map<string, { frequency: number; positions: number[] }>()

      for (const response of responses) {
        const placements = (response.card_placements || {}) as Record<string, string>
        let position = 1

        for (const [cardId, categoryName] of Object.entries(placements)) {
          if (categoryName === analysis.name) {
            const existing = cardMap.get(cardId) || { frequency: 0, positions: [] }
            existing.frequency++
            existing.positions.push(position++)
            cardMap.set(cardId, existing)
          }
        }
      }

      result.push({
        categoryName: analysis.name,
        isStandardized: false,
        originalCategories: [analysis.name],
        uniqueCardCount: analysis.cardIds.size,
        cards: toCardsList(cardMap, cards),
        createdByCount: analysis.frequency,
        agreementScore: null,
      })
    }

    return result
  }, [cards, responses, standardizations])
}
