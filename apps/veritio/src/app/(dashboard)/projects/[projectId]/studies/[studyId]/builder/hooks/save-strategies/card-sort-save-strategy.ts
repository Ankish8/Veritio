/**
 * Card Sort Save Strategy
 *
 * Handles saving Card Sort study type content.
 * Includes UUID validation to prevent "undefined" string errors.
 */

import { withRetry, throwOnServerError } from '@/lib/utils/retry'
import { useCardSortBuilderStore, selectCardSortIsDirty } from '@/stores/study-builder'
import type { CardWithImage, Category, CardSortSettings } from '@veritio/study-types'
import type { ExtendedCardSortSettings } from '@veritio/study-types/study-flow-types'
import type { SaveContext, SaveResult, SaveStrategy, FlowDataSnapshot } from './types'
import {
  isValidUUID,
  captureFlowDataSnapshot,
  handleSaveResults,
  markFlowSavedIfUnchanged,
  markContentSavedIfUnchanged,
  saveFlowQuestions,
  saveStudySettings,
  extendSettings,
} from './save-utils'

export const cardSortSaveStrategy: SaveStrategy = {
  async save(context: SaveContext): Promise<SaveResult> {
    const { studyId, flowStore, isFlowDirty, authFetch, stores } = context

    const contentStore = useCardSortBuilderStore.getState()
    const isContentDirty = selectCardSortIsDirty(contentStore)

    // If nothing is dirty, skip the save entirely (A/B tests save immediately via SWR)
    if (!isContentDirty && !isFlowDirty) {
      return { saved: false, savedTypes: [] }
    }

    if (isContentDirty) stores.setCardSortSaveStatus('saving')
    if (isFlowDirty) stores.setFlowSaveStatus('saving')

    // Capture exact data being sent BEFORE the API call
    let sentCardSortData: { cards: CardWithImage[]; categories: Category[]; settings: CardSortSettings } | null = null
    let sentFlowData: FlowDataSnapshot | null = null

    if (isFlowDirty) {
      sentFlowData = captureFlowDataSnapshot(flowStore)
    }

    try {
      const savePromises: Promise<Response>[] = []

      // Only save content if it's dirty
      if (isContentDirty) {
        const { cards, categories, settings } = contentStore

        // Validate data before sending
        if (!Array.isArray(cards) || !Array.isArray(categories)) {
          stores.setCardSortSaveStatus('error')
          throw new Error('Invalid card sort data. Please refresh the page.')
        }

        // Filter out cards with invalid UUIDs (prevents "undefined" string error)
        const validCards = cards.filter((card) => isValidUUID(card.id))

        // Sanitize cards to match API schema (only include expected fields)
        const sanitizedCards = validCards.map((card, index) => ({
          id: card.id,
          label: card.label || '',
          description: card.description ?? null,
          position: card.position ?? index,
          image: card.image ?? null,
        }))

        // Filter out categories with invalid UUIDs
        const validCategories = categories.filter((cat) => isValidUUID(cat.id))

        // Sanitize categories similarly
        const sanitizedCategories = validCategories.map((cat, index) => ({
          id: cat.id,
          label: cat.label || '',
          description: cat.description ?? null,
          position: cat.position ?? index,
        }))

        sentCardSortData = JSON.parse(JSON.stringify({ cards, categories, settings }))

        savePromises.push(
          withRetry(() => authFetch(`/api/studies/${studyId}/cards`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cards: sanitizedCards }),
          }).then(throwOnServerError)),
          withRetry(() => authFetch(`/api/studies/${studyId}/categories`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categories: sanitizedCategories }),
          }).then(throwOnServerError))
        )

        const extendedSettings = extendSettings(settings, flowStore) as ExtendedCardSortSettings
        savePromises.push(saveStudySettings(studyId, extendedSettings, flowStore, authFetch))
      }

      // Only save flow if it's dirty (and content wasn't - otherwise settings already saved above)
      if (isFlowDirty && !isContentDirty) {
        const extendedSettings = extendSettings(contentStore.settings, flowStore) as ExtendedCardSortSettings
        savePromises.push(saveStudySettings(studyId, extendedSettings, flowStore, authFetch))
      }

      // Save flow questions if flow is dirty
      if (isFlowDirty) {
        savePromises.push(saveFlowQuestions(studyId, flowStore, authFetch))
      }

      // Handle save results
      await handleSaveResults(savePromises, (status) => {
        if (isContentDirty) stores.setCardSortSaveStatus(status)
        if (isFlowDirty) stores.setFlowSaveStatus(status)
      })

      // Mark as saved with EXACT data that was sent
      if (isContentDirty && sentCardSortData) {
        markContentSavedIfUnchanged(useCardSortBuilderStore, sentCardSortData, () => {
          const s = useCardSortBuilderStore.getState()
          return { cards: s.cards, categories: s.categories, settings: s.settings }
        })
      }

      if (isFlowDirty && sentFlowData) {
        markFlowSavedIfUnchanged(sentFlowData, 'Card Sort')
      }

      const savedTypes: ('content' | 'flow')[] = []
      if (isContentDirty) savedTypes.push('content')
      if (isFlowDirty) savedTypes.push('flow')
      return { saved: true, savedTypes }
    } catch (error) {
      if (isContentDirty) stores.setCardSortSaveStatus('error')
      if (isFlowDirty) stores.setFlowSaveStatus('error')
      throw error
    }
  }
}
