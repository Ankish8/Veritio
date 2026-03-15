import { z } from 'zod'
import type { CardSortBuilderData, CardSortValidationResult } from './types'
import { defaultCardSortSettings } from './types'
import { validateCardSort } from './validation'

export const cardSortSettingsSchema = z.object({
  mode: z.enum(['open', 'closed', 'hybrid']),
  randomizeCards: z.boolean().optional(),
  randomizeCategories: z.boolean().optional(),
  showProgress: z.boolean().optional(),
  allowSkip: z.boolean().optional(),
  includeUnclearCategory: z.boolean().optional(),
  showCategoryDescriptions: z.boolean().optional(),
  allowCategoryCreation: z.boolean().optional(),
  cardLabel: z.string().optional(),
  categoryLabel: z.string().optional(),
  unclearCategoryLabel: z.string().optional(),
  cardLimit: z.number().optional(),
  showTooltipDescriptions: z.boolean().optional(),
  allowCardImages: z.boolean().optional(),
  allowComments: z.boolean().optional(),
  showCardOrderIndicators: z.boolean().optional(),
  showUnsortedIndicator: z.boolean().optional(),
  requireAllCardsSorted: z.boolean().optional(),
  cardSubset: z.number().optional(),
  allowCategoryDescriptions: z.boolean().optional(),
  addCategoryLimits: z.boolean().optional(),
  requireCategoriesNamed: z.boolean().optional(),
})

export const cardSortPluginConfig = {
  studyType: 'card_sort' as const,
  name: 'Card Sort',
  description: 'Discover how users categorize and organize information',
  icon: 'layout-grid',
  version: '1.0.0',

  capabilities: {
    hasBuilder: true,
    hasPlayer: true,
    hasAnalysis: true,
    hasExport: true,
    supportsBranding: true,
    supportsStudyFlow: true,
  },

  builder: {
    defaultSettings: defaultCardSortSettings,
    tabs: [
      { id: 'content', label: 'Cards & Categories', icon: 'layout-grid' },
      { id: 'study-flow', label: 'Study Flow', icon: 'workflow' },
    ],
    componentPath: '@/components/builders/card-sort',
  },

  player: {
    componentPath: '@/components/players/card-sort',
  },

  results: {
    tabs: [
      { id: 'overview', label: 'Overview', icon: 'bar-chart' },
      { id: 'analysis', label: 'Analysis', icon: 'pie-chart' },
      { id: 'cards', label: 'Cards', icon: 'credit-card' },
      { id: 'categories', label: 'Categories', icon: 'folder' },
      { id: 'pca', label: 'PCA', icon: 'scatter-chart' },
      { id: 'participants', label: 'Participants', icon: 'users' },
      { id: 'questionnaire', label: 'Questionnaire', icon: 'clipboard-list' },
      { id: 'downloads', label: 'Downloads', icon: 'download' },
    ],
    componentPath: '@/components/analysis/card-sort',
  },

  validation: {
    validate: (data: CardSortBuilderData): CardSortValidationResult =>
      validateCardSort(data.cards, data.categories, data.settings),
  },

  export: {
    formats: ['csv', 'xlsx', 'pdf'],
    servicePath: '@/services/export',
  },

  settingsSchema: cardSortSettingsSchema,
}

export type CardSortPlugin = typeof cardSortPluginConfig
