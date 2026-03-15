/**
 * PDF Service Types
 *
 * Types for server-side PDF generation with Puppeteer
 */

// ============================================================================
// Render Token Types
// ============================================================================

export interface RenderTokenPayload {
  studyId: string
  userId: string
  sections: string[]
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click'
}

export interface RenderTokenData extends RenderTokenPayload {
  exp: number // Unix timestamp
  iat: number // Issued at
}

// ============================================================================
// Capture Types
// ============================================================================

export interface CaptureOptions {
  url: string
  viewport: { width: number; height: number }
  waitForFunction?: string // e.g., 'window.__PDF_READY__'
  timeout?: number
}

export interface CapturedImage {
  id: string
  title: string
  imageData: Buffer // PNG buffer
  width: number
  height: number
}

export interface CaptureProgress {
  current: number
  total: number
  stage: string
  sectionTitle?: string
}

// ============================================================================
// PDF Assembly Types
// ============================================================================

export interface PDFAssemblyOptions {
  studyId: string
  studyTitle: string
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click'
  studyDescription?: string | null
  participantCount: number
  completedCount: number
  completionRate: number
  includeCoverPage: boolean
  includeTableOfContents: boolean
  branding: {
    generatedDate: Date
    companyName?: string
  }
  // Study-specific metrics for overview section
  studyMetrics?: {
    totalCards?: number
    totalCategories?: number
    totalTasks?: number
    totalQuestions?: number
    successRate?: number
    directnessRate?: number
    averageTimeMinutes?: number
  }
}

export interface PDFExportRequest {
  studyId: string
  sections: string[]
  options?: {
    includeCoverPage?: boolean
    includeTableOfContents?: boolean
  }
}

export interface PDFExportResponse {
  success: boolean
  pdf?: string // base64 encoded PDF
  filename?: string
  error?: string
}

// ============================================================================
// Render Page Types
// ============================================================================

export interface RenderPageProps {
  params: Promise<{ studyId: string }>
  searchParams: Promise<{ token?: string }>
}

export interface RenderPagePropsWithId {
  params: Promise<{ studyId: string; questionId?: string; taskId?: string }>
  searchParams: Promise<{ token?: string }>
}
