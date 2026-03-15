/**
 * PDF Export Module
 *
 * Public API for PDF report generation.
 * Note: PDF generation is now handled server-side via Puppeteer.
 * This module provides section definitions and PDF builder utilities.
 */

// Section registry
export {
  getSectionsForStudyType,
  getSectionsWithAvailability,
  getDefaultSections,
  getSectionById,
  checkSectionDataAvailability,
  CARD_SORT_SECTIONS,
  TREE_TEST_SECTIONS,
  SURVEY_SECTIONS,
} from './section-registry'

// PDF Builder utilities - PDFBuilder NOT exported to avoid loading jsPDF upfront
// Import directly: import { PDFBuilder } from './pdf-builder'
export { createPDFFilename, formatStudyType, PDF_COLORS } from './pdf-builder'

// Types
export type {
  StudyType,
  SectionCategory,
  SectionDefinition,
  ChartElementDef,
  TOCEntry,
  CoverPageConfig,
  PDFBuilderOptions,
  ImageOptions,
  TextOptions,
} from './types'
