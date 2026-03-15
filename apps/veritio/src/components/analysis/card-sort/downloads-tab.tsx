'use client'

import { useMemo } from 'react'
import { DownloadsTabBase, type ExportOption } from '@/components/analysis/shared'
import {
  exportCardSortRawResponses,
  exportCardSortSimilarityMatrix,
  exportCardSortCategoryAgreement,
  exportCardSortSynCaps,
  exportCardSortCardCategoryMatrix,
  createExportFilename,
  type ExportFormat,
  type DataExportFormat,
  type Card,
  type Category,
  type CardSortResponse,
  type CardSortParticipant,
} from '@/lib/export'

interface DownloadsTabProps {
  studyId: string
  studyTitle: string
  cards: Card[]
  categories: Category[]
  responses: CardSortResponse[]
  participants: CardSortParticipant[]
  similarityMatrix?: number[][]
  categoryAgreement?: Record<string, {
    cardLabel: string
    categories: { name: string; count: number; percentage: number }[]
  }>
  analysis?: {
    dendrogram?: unknown
    similarityMatrix?: unknown
    categoryAgreement?: unknown
  } | null
  flowQuestions?: unknown[]
  flowResponses?: unknown[]
  filteredParticipantIds?: Set<string> | null
}

export function DownloadsTab({
  studyId: _studyId,
  studyTitle,
  cards,
  categories,
  responses,
  participants,
  similarityMatrix,
  categoryAgreement,
  analysis: _analysis,
  flowQuestions: _flowQuestions,
  flowResponses: _flowResponses,
  filteredParticipantIds,
}: DownloadsTabProps) {
  const hasResponses = responses.length > 0

  const hasSimilarityMatrix = similarityMatrix && similarityMatrix.length > 0
  const hasCategoryAgreement = categoryAgreement && Object.keys(categoryAgreement).length > 0

  const exportData = useMemo(() => ({
    cards,
    categories,
    responses,
    participants,
  }), [cards, categories, responses, participants])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const makeExportOptions = (format: ExportFormat, slug: string) => ({
    format: format as DataExportFormat,
    filename: createExportFilename(studyTitle, slug, format as DataExportFormat),
    studyTitle,
    filteredParticipantIds,
  })

  const exportOptions: ExportOption[] = useMemo(() => [
    {
      id: 'raw-responses',
      title: 'Raw Responses',
      description: 'Complete participant response data including card placements and categories.',
      formats: ['csv'] as ExportFormat[],
      disabled: !hasResponses,
      onDownload: async (format: ExportFormat) => {
        await exportCardSortRawResponses(exportData, makeExportOptions(format, 'raw_responses'))
      },
    },
    {
      id: 'similarity-matrix',
      title: 'Similarity Matrix',
      description: 'Card-to-card similarity scores showing how often cards were grouped together.',
      formats: ['csv'] as ExportFormat[],
      disabled: !hasSimilarityMatrix,
      onDownload: async (format: ExportFormat) => {
        if (!similarityMatrix) return
        await exportCardSortSimilarityMatrix(
          cards.map(c => c.label),
          similarityMatrix,
          makeExportOptions(format, 'similarity_matrix'),
        )
      },
    },
    {
      id: 'category-agreement',
      title: 'Category Agreement',
      description: 'Distribution of cards across categories showing placement patterns.',
      formats: ['csv'] as ExportFormat[],
      disabled: !hasCategoryAgreement,
      onDownload: async (format: ExportFormat) => {
        if (!categoryAgreement) return
        await exportCardSortCategoryAgreement(categoryAgreement, makeExportOptions(format, 'category_agreement'))
      },
    },
    {
      id: 'card-category-matrix',
      title: 'Card-Category Matrix',
      description: 'Pivot table showing count of placements for each card in each category.',
      formats: ['csv'] as ExportFormat[],
      disabled: !hasResponses,
      onDownload: async (format: ExportFormat) => {
        await exportCardSortCardCategoryMatrix(exportData, makeExportOptions(format, 'card_category_matrix'))
      },
    },
    {
      id: 'syncaps',
      title: 'SynCaps Format',
      description: 'Export for external cluster analysis tools like SynCaps.',
      formats: ['csv'] as ExportFormat[],
      disabled: !hasResponses,
      onDownload: async (format: ExportFormat) => {
        await exportCardSortSynCaps(exportData, makeExportOptions(format, 'syncaps'))
      },
    },
    {
      id: 'questionnaire',
      title: 'Questionnaire Responses',
      description: 'Pre-study and post-study questionnaire answers from all participants.',
      formats: ['csv'] as ExportFormat[],
      comingSoon: true,
    },
  ], [
    hasResponses,
    hasSimilarityMatrix,
    hasCategoryAgreement,
    exportData,
    cards,
    similarityMatrix,
    categoryAgreement,
    makeExportOptions,
  ])

  return (
    <div className="space-y-4 sm:space-y-6">
      <DownloadsTabBase
        studyType="card_sort"
        exportOptions={exportOptions}
      />
    </div>
  )
}
