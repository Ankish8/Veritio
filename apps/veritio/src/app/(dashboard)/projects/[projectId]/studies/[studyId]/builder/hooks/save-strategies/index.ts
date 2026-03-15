/**
 * Save Strategies Index
 *
 * Exports all save strategies and provides a factory function
 * to get the appropriate strategy based on study type.
 */

import type { Study } from '@veritio/study-types'
import type { SaveStrategy } from './types'
import { surveySaveStrategy } from './survey-save-strategy'
import { cardSortSaveStrategy } from './card-sort-save-strategy'
import { treeTestSaveStrategy } from './tree-test-save-strategy'
import { prototypeTestSaveStrategy } from './prototype-test-save-strategy'
import { firstClickSaveStrategy } from './first-click-save-strategy'
import { firstImpressionSaveStrategy } from './first-impression-save-strategy'
import { liveWebsiteSaveStrategy } from './live-website-save-strategy'

// Re-export types for consumers
export type { SaveResult, SaveContext, SaveStrategy, FlowDataSnapshot, SetStatusFn } from './types'

// Re-export utilities for potential external use
export {
  isValidUUID,
  captureFlowDataSnapshot,
  isFlowStateUnchanged,
  markFlowSavedIfUnchanged,
  markContentSavedIfUnchanged,
  collectValidQuestions,
  handleSaveResults,
  saveFlowQuestions,
  saveStudySettings,
  extendSettings,
} from './save-utils'

// Strategy map for lookup
const strategyMap: Record<Study['study_type'], SaveStrategy> = {
  survey: surveySaveStrategy,
  card_sort: cardSortSaveStrategy,
  tree_test: treeTestSaveStrategy,
  prototype_test: prototypeTestSaveStrategy,
  first_click: firstClickSaveStrategy,
  first_impression: firstImpressionSaveStrategy,
  live_website_test: liveWebsiteSaveStrategy,
}

/**
 * Gets the appropriate save strategy for a study type.
 *
 * @param studyType - The study type
 * @returns The save strategy, or cardSortSaveStrategy as default
 */
export function getSaveStrategy(studyType: Study['study_type']): SaveStrategy {
  return strategyMap[studyType] ?? cardSortSaveStrategy
}

// Export individual strategies for direct use if needed
export {
  surveySaveStrategy,
  cardSortSaveStrategy,
  treeTestSaveStrategy,
  prototypeTestSaveStrategy,
  firstClickSaveStrategy,
  firstImpressionSaveStrategy,
  liveWebsiteSaveStrategy,
}
