export type CardSortMode = 'open' | 'closed' | 'hybrid'

export interface CardImage {
  url: string
  alt?: string
  filename?: string
}

export interface Card {
  id: string
  study_id: string
  title: string
  description?: string | null
  position: number
  image?: CardImage | null
  created_at: string
}

export type CardInsert = Omit<Card, 'id' | 'created_at'>

export type CardUpdate = Partial<Omit<Card, 'id' | 'study_id' | 'created_at'>>

export interface Category {
  id: string
  study_id: string
  name: string
  description?: string | null
  position: number
  min_cards?: number | null
  max_cards?: number | null
  is_predefined: boolean
  created_at: string
}

export type CategoryInsert = Omit<Category, 'id' | 'created_at'>

export type CategoryUpdate = Partial<Omit<Category, 'id' | 'study_id' | 'created_at'>>

export interface CardSortSettings {
  mode: CardSortMode
  randomizeCards?: boolean
  randomizeCategories?: boolean
  showProgress?: boolean
  allowSkip?: boolean
  includeUnclearCategory?: boolean
  showCategoryDescriptions?: boolean
  allowCategoryCreation?: boolean
  cardLabel?: string
  categoryLabel?: string
  unclearCategoryLabel?: string
  cardLimit?: number
  showTooltipDescriptions?: boolean
  allowCardImages?: boolean
  allowComments?: boolean
  showCardOrderIndicators?: boolean
  showUnsortedIndicator?: boolean
  requireAllCardsSorted?: boolean
  cardSubset?: number
  allowCategoryDescriptions?: boolean
  addCategoryLimits?: boolean
  requireCategoriesNamed?: boolean
}

export const defaultCardSortSettings: CardSortSettings = {
  mode: 'open',
  randomizeCards: true,
  randomizeCategories: false,
  allowSkip: false,
  showProgress: true,
  includeUnclearCategory: false,
  showCategoryDescriptions: false,
  allowCategoryCreation: true,
  cardLabel: 'Cards',
  categoryLabel: 'Categories',
  unclearCategoryLabel: 'Not sure / Unclear',
}

export interface CardSortResult {
  id: string
  participant_id: string
  card_id: string
  category_id?: string | null
  category_name?: string | null
  is_user_created_category: boolean
  created_at: string
}

export interface CardPlacement {
  cardId: string
  cardTitle: string
  categoryId?: string | null
  categoryName: string
  count: number
  percentage: number
}

export interface CategoryAgreement {
  categoryId: string
  categoryName: string
  isPredefined: boolean
  cardCount: number
  participantCount: number
  agreementScore: number // 0-100
}

export interface SimilarityMatrix {
  cardIds: string[]
  cardTitles: string[]
  matrix: number[][] // 0-1 similarity scores
}

export interface CardSortBuilderData {
  cards: Card[]
  categories: Category[]
  settings: CardSortSettings
}

export interface SortedCard {
  cardId: string
  categoryId?: string
  categoryName?: string
  isUserCreated: boolean
}

export interface ParticipantCategory {
  id: string
  name: string
  description?: string
  isUserCreated: boolean
}

export interface CardSortPlayerState {
  cards: Card[]
  categories: ParticipantCategory[]
  sortedCards: Map<string, SortedCard>
  currentCardIndex: number
  isComplete: boolean
}

export interface CardSortValidationResult {
  isValid: boolean
  errors: CardSortValidationError[]
  warnings: CardSortValidationWarning[]
}

export interface CardSortValidationError {
  code: CardSortValidationErrorCode
  message: string
  field?: string
  cardId?: string
  categoryId?: string
}

export interface CardSortValidationWarning {
  code: CardSortValidationWarningCode
  message: string
  field?: string
}

export type CardSortValidationErrorCode =
  | 'NO_CARDS'
  | 'NO_CATEGORIES' // For closed/hybrid mode
  | 'CARD_MISSING_TITLE'
  | 'CATEGORY_MISSING_NAME'
  | 'DUPLICATE_CARD_TITLE'
  | 'DUPLICATE_CATEGORY_NAME'
  | 'CARD_LIMIT_EXCEEDED'

export type CardSortValidationWarningCode =
  | 'FEW_CARDS'
  | 'FEW_CATEGORIES'
  | 'CARD_MISSING_DESCRIPTION'
  | 'CATEGORY_MISSING_DESCRIPTION'
  | 'UNBALANCED_CATEGORY_LIMITS'
