/**
 * PDF Export Types
 *
 * Type definitions for the PDF report generation system.
 * Supports Card Sort, Tree Test, and Survey study types.
 */

// jsPDF type used by PDFBuilder but imported directly in implementation files

// ============================================================================
// Core Types
// ============================================================================

export type StudyType = 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression'

export type SectionCategory = 'overview' | 'analysis' | 'questionnaire' | 'participants'

export interface PDFExportConfig {
  // Study metadata
  studyId: string
  studyTitle: string
  studyType: StudyType
  studyDescription?: string | null

  // Study stats
  participantCount: number
  completedCount: number
  completionRate: number

  // Report settings
  includeTableOfContents: boolean
  includeCoverPage: boolean

  // Selected sections (by section ID)
  selectedSections: string[]

  // Chart preferences (read from localStorage)
  chartPreferences: Record<string, string>

  // Branding (white-label)
  branding: {
    companyName?: string
    reportTitle?: string
    generatedDate: Date
  }

  // Quality settings
  imageQuality: 'standard' | 'high'

  // Study data for text-based rendering (optional - for when charts can't be captured)
  studyData?: {
    // Card sort specific
    totalCards?: number
    totalCategories?: number
    // Tree test specific
    totalTasks?: number
    successRate?: number
    directnessRate?: number
    // Survey specific
    totalQuestions?: number
    // General
    averageTimeMinutes?: number
  }
}

// ============================================================================
// Section Definitions
// ============================================================================

export interface ChartElementDef {
  id: string
  /** CSS selector to find the chart in DOM (e.g., '[data-pdf-chart="dendrogram"]') */
  domSelector: string
  title: string
  /** localStorage key for chart type preference (for questionnaire charts) */
  preferenceKey?: string
}

export interface SectionDefinition {
  id: string
  title: string
  description: string
  category: SectionCategory
  /** Whether this section is selected by default */
  isDefault: boolean
  /** Data dependencies - paths like 'analysis.dendrogram' */
  requiresData: string[]
  /** Charts to capture for this section */
  chartElements: ChartElementDef[]
  /** Whether this section has dynamic charts (like questionnaire) */
  isDynamic?: boolean
}

// ============================================================================
// Table of Contents
// ============================================================================

export interface TOCEntry {
  title: string
  pageNumber: number
  level: 1 | 2
}

// ============================================================================
// Page Layout
// ============================================================================

export interface PageDimensions {
  width: number  // mm
  height: number // mm
}

export interface PageMargins {
  top: number
  right: number
  bottom: number
  left: number
}

export interface CoverPageConfig {
  studyTitle: string
  studyType: StudyType
  studyDescription?: string | null
  participantCount: number
  completionRate: number
  generatedDate: Date
  companyName?: string
}

// ============================================================================
// Chart Capture
// ============================================================================

export interface CaptureOptions {
  /** Scale factor for retina quality (default: 2) */
  scale?: number
  /** Background color (default: #ffffff) */
  backgroundColor?: string
  /** Enable CORS for external images */
  useCORS?: boolean
  /** Enable debug logging */
  logging?: boolean
}

export interface CapturedChart {
  id: string
  title: string
  canvas: HTMLCanvasElement
  width: number
  height: number
}

// ============================================================================
// Progress Tracking
// ============================================================================

export interface PDFGenerationProgress {
  current: number
  total: number
  stage: string
  sectionTitle?: string
}

export type ProgressCallback = (progress: PDFGenerationProgress) => void

// ============================================================================
// PDF Builder
// ============================================================================

export interface PDFBuilderOptions {
  pageSize?: 'a4' | 'letter'
  orientation?: 'portrait' | 'landscape'
  margins?: Partial<PageMargins>
}

export interface ImageOptions {
  x: number
  y: number
  width: number
  height: number
  /** Maintain aspect ratio */
  keepAspectRatio?: boolean
}

export interface TextOptions {
  x: number
  y: number
  fontSize?: number
  fontStyle?: 'normal' | 'bold' | 'italic'
  color?: string
  align?: 'left' | 'center' | 'right'
  maxWidth?: number
}

// ============================================================================
// Export Function Types
// ============================================================================

export interface PDFExportResult {
  success: boolean
  filename?: string
  error?: string
}

export type PDFExportFunction = (
  config: PDFExportConfig,
  onProgress?: ProgressCallback
) => Promise<PDFExportResult>
