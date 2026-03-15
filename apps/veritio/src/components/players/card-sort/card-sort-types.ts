import type { CardWithImage, Category, CardSortSettings } from '@veritio/study-types'
import type { BrandingSettings } from '@/components/builders/shared/types'

export interface ExtendedCardSortSettings extends CardSortSettings {
  requireAllCardsSorted?: boolean
  requireCategoriesNamed?: boolean
}

export interface ResponsePreventionData {
  cookieId: string | null
  fingerprintHash: string | null
  fingerprintConfidence: number | null
}

export interface CardSortPlayerProps {
  studyId: string
  shareCode: string
  cards: CardWithImage[]
  categories: Category[]
  settings: ExtendedCardSortSettings
  welcomeMessage: string
  thankYouMessage: string
  instructions?: { title?: string; part1?: string; part2?: string }
  embeddedMode?: boolean
  previewMode?: boolean
  onComplete?: () => void
  branding?: BrandingSettings | null
  previewBanner?: React.ReactNode
  preventionData?: ResponsePreventionData
  sessionToken?: string | null
  participantId?: string | null
}

export interface PlacedCard {
  cardId: string
  categoryId: string
}

export const UNCLEAR_CATEGORY_ID = '__unclear__'

export function getSubmitDisabledReason(
  unnamedCount: number,
  unsortedCount: number,
  mode: string,
): string | undefined {
  if (unnamedCount > 0) {
    if (unnamedCount === 1) return 'Name your group before finishing'
    return `Name your ${unnamedCount} groups before finishing`
  }
  if (unsortedCount > 0 && mode === 'closed') {
    return 'Sort all cards before finishing'
  }
  return undefined
}

export interface RecordingProps {
  isRecording: boolean
  isPaused: boolean
  isUploading: boolean
  uploadProgress: number
}
