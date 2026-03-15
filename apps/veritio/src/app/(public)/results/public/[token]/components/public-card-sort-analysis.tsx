'use client'

/**
 * Public Card Sort Analysis
 *
 * Read-only version of the Card Sort analysis for public results sharing.
 * Displays all analysis visualizations without segment filtering.
 */

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CardsTab } from '@/components/analysis/card-sort/cards-tab'
import { CategoriesTab } from '@/components/analysis/card-sort/categories-tab'
import { StandardizationGrid } from '@/components/analysis/card-sort/standardization-grid'
import { ResultsMatrix } from '@/components/analysis/card-sort/results-matrix'
import { ChartSkeleton } from '@/components/dashboard/skeletons'
import type { Card, Category, CategoryStandardization } from '@veritio/study-types'
import type { StandardizationMapping } from '@/lib/algorithms/category-standardization'

// Dynamic imports for heavy visualization components
const SimilarityMatrix = dynamic(
  () => import('@/components/analysis/card-sort/similarity-matrix').then(mod => ({ default: mod.SimilarityMatrix })),
  { loading: () => <ChartSkeleton />, ssr: false }
)
const PCATab = dynamic(
  () => import('@/components/analysis/card-sort/pca-tab').then(mod => ({ default: mod.PCATab })),
  { loading: () => <ChartSkeleton />, ssr: false }
)

interface ResponseData {
  id?: string
  participant_id: string
  card_placements: Record<string, string> | unknown
  custom_categories?: unknown
  total_time_ms?: number | null
}

interface AnalysisData {
  similarityMatrix: any
  dendrogram: any
  optimalOrder: string[]
  suggestedClusters: { count: number; heights: number[] }
  topSimilarPairs: { cardA: string; cardB: string; similarity: number }[]
  naturalClusters: string[][]
  categoryAgreement: Record<string, {
    cardLabel: string
    categories: { name: string; count: number; percentage: number }[]
  }>
}

interface PublicCardSortAnalysisProps {
  cards: Card[]
  categories: Category[]
  responses: ResponseData[]
  participants: any[]
  standardizations: CategoryStandardization[]
  analysis: AnalysisData | null
  mode: 'open' | 'closed' | 'hybrid'
}

export function PublicCardSortAnalysis({
  cards,
  categories,
  responses,
  participants,
  standardizations: rawStandardizations,
  analysis,
  mode,
}: PublicCardSortAnalysisProps) {
  const [activeSubTab, setActiveSubTab] = useState('cards')

  // Transform standardizations to expected format
  const standardizations: StandardizationMapping[] = useMemo(() => {
    return (rawStandardizations || []).map((s) => ({
      standardizedName: s.standardized_name,
      originalNames: s.original_names,
      agreementScore: s.agreement_score ?? 0,
    }))
  }, [rawStandardizations])

  // Build sub-tabs based on study mode
  const subTabs = [
    { value: 'cards', label: 'Cards', show: true },
    { value: 'categories', label: 'Categories', show: true },
    { value: 'standardization', label: 'Standardization Grid', show: mode !== 'closed' },
    { value: 'results-matrix', label: 'Results Matrix', show: mode === 'closed' },
    { value: 'similarity', label: 'Similarity Matrix', show: !!analysis },
    { value: 'pca', label: 'PCA', show: true },
  ]

  const visibleTabs = subTabs.filter(tab => tab.show)

  return (
    <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
      <TabsList variant="underline" className="flex-wrap h-auto mb-4">
        {visibleTabs.map(tab => (
          <TabsTrigger key={tab.value} variant="underline" value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="cards" className="mt-0">
        <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
          <CardsTab
            cards={cards}
            responses={responses}
            categories={categories}
            mode={mode}
          />
        </div>
      </TabsContent>

      <TabsContent value="categories" className="mt-0">
        <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
          <CategoriesTab
            categories={categories}
            cards={cards}
            responses={responses}
            mode={mode}
            standardizations={standardizations}
            onStandardizationsChange={() => {}} // Read-only - no changes allowed
          />
        </div>
      </TabsContent>

      {mode !== 'closed' && (
        <TabsContent value="standardization" className="mt-0">
          <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
            <StandardizationGrid
              cards={cards}
              responses={responses}
              standardizations={standardizations}
            />
          </div>
        </TabsContent>
      )}

      {mode === 'closed' && (
        <TabsContent value="results-matrix" className="mt-0">
          <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
            <ResultsMatrix
              cards={cards}
              categories={categories}
              responses={responses}
            />
          </div>
        </TabsContent>
      )}

      {analysis && (
        <TabsContent value="similarity" className="mt-0">
          <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
            <SimilarityMatrix
              data={analysis.similarityMatrix}
              optimalOrder={analysis.optimalOrder}
              participantCount={responses.length}
            />
          </div>
        </TabsContent>
      )}

      <TabsContent value="pca" className="mt-0">
        <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
          <PCATab
            cards={cards}
            responses={responses}
            participants={participants}
          />
        </div>
      </TabsContent>
    </Tabs>
  )
}
