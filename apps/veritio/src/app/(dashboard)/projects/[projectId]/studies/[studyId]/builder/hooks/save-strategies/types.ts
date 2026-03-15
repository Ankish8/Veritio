/**
 * Shared Types for Save Strategies
 *
 * These types define the interfaces for the strategy pattern used in builder saves.
 * Each study type implements SaveStrategy to handle its specific save logic.
 */

import type { useAuthFetch } from '@/hooks'
import type { Study } from '@veritio/study-types'
import type { useStudyFlowBuilderStore } from '@/stores/study-flow-builder'
import type { BuilderStores } from '../use-builder-stores'

/**
 * Result of a save operation
 */
export interface SaveResult {
  /** Whether any data was actually saved to the API */
  saved: boolean
  /** What was saved */
  savedTypes: ('content' | 'flow')[]
}

/**
 * Save status for stores
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Common context passed to all save strategies
 */
export interface SaveContext {
  /** Study ID */
  studyId: string
  /** Study object (for study type and settings) */
  study: Study
  /** Flow store state snapshot */
  flowStore: ReturnType<typeof useStudyFlowBuilderStore.getState>
  /** Whether flow data is dirty */
  isFlowDirty: boolean
  /** Auth-enabled fetch function */
  authFetch: ReturnType<typeof useAuthFetch>
  /** Builder stores for status updates */
  stores: BuilderStores
}

/**
 * Flow data snapshot for dirty detection and marking saved
 */
export interface FlowDataSnapshot {
  flowSettings: ReturnType<typeof useStudyFlowBuilderStore.getState>['flowSettings']
  screeningQuestions: ReturnType<typeof useStudyFlowBuilderStore.getState>['screeningQuestions']
  preStudyQuestions: ReturnType<typeof useStudyFlowBuilderStore.getState>['preStudyQuestions']
  postStudyQuestions: ReturnType<typeof useStudyFlowBuilderStore.getState>['postStudyQuestions']
  surveyQuestions: ReturnType<typeof useStudyFlowBuilderStore.getState>['surveyQuestions']
}

/**
 * Save Strategy Interface
 *
 * Each study type implements this interface to handle its specific save logic.
 */
export interface SaveStrategy {
  /**
   * Execute the save operation
   * @param context - Common save context
   * @returns Promise resolving to SaveResult
   */
  save(context: SaveContext): Promise<SaveResult>
}

/**
 * Status setter function type
 */
export type SetStatusFn = (status: SaveStatus) => void
