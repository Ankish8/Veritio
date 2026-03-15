/**
 * Export System
 *
 * Comprehensive export infrastructure for UX research studies.
 * Supports CSV and PDF formats.
 *
 * @example
 * import { exportTreeTestRawResponses, createExportFilename } from './index'
 *
 * await exportTreeTestRawResponses(data, {
 *   format: 'csv',
 *   filename: createExportFilename(studyTitle, 'raw_responses', 'csv'),
 *   studyTitle,
 *   filteredParticipantIds: segmentFilter,
 * })
 */

// Core types
export * from './types'

// CSV utilities
export {
  formatCSV,
  downloadCSV,
  formatDateForCSV,
  formatDurationForCSV,
  formatPercentForCSV,
  formatBooleanForCSV,
  formatArrayForCSV,
  sanitizeFilename,
  createCSVFilename,
} from './csv/index'

// Utility functions
export {
  downloadBlob,
  createExportFilename,
} from './utils'

// Tree Test exports
export {
  exportTreeTestRawResponses,
  exportTreeTestTaskSummary,
  exportTreeTestOverallSummary,
  exportTreeTestFirstClickAnalysis,
  type TreeTestExportData,
} from './tree-test/index'

// Card Sort exports
export {
  exportCardSortRawResponses,
  exportCardSortStandardizedResponses,
  exportCardSortSimilarityMatrix,
  exportCardSortCategoryAgreement,
  exportCardSortSynCaps,
  exportCardSortCardCategoryMatrix,
  type CardSortExportData,
  type Card,
  type Category,
  type CardSortResponse,
  type CardSortParticipant,
  type CategoryStandardization,
} from './card-sort/index'

// Survey exports
export {
  exportSurveyRawResponses,
  exportSurveySummaryReport,
  exportSurveyParticipantData,
  exportSurveyCrossTabulation,
  type SurveyExportData,
  type SurveyQuestion,
  type SurveyResponse,
  type SurveyParticipant,
} from './survey/index'

// First-Click exports
export {
  exportFirstClickRawResponses,
  exportFirstClickTaskSummary,
  exportFirstClickParticipantSummary,
} from './first-click/index'

// Prototype Test exports
export {
  exportPrototypeTestRawResponses,
  exportPrototypeTestTaskSummary,
  exportPrototypeTestOverallSummary,
  type PrototypeTestExportData,
} from './prototype-test/index'

// Live Website exports
export {
  exportLiveWebsiteRawResponses,
  exportLiveWebsiteTaskSummary,
  exportLiveWebsiteBehavioralEvents,
  exportLiveWebsiteOverallSummary,
  type LiveWebsiteExportData,
} from './live-website/index'

// PDF exports (section registry and utilities - generation is server-side)
export {
  getSectionsForStudyType,
  getSectionsWithAvailability,
  getDefaultSections,
  createPDFFilename,
  type SectionDefinition,
} from './pdf/index'
