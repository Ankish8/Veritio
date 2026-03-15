/**
 * PDF Builder
 *
 * A wrapper around jsPDF that provides professional layout helpers,
 * consistent styling, and convenient methods for building multi-page reports.
 */

import { jsPDF } from 'jspdf'
import type {
  PDFBuilderOptions,
  PageDimensions,
  PageMargins,
  TOCEntry,
  ImageOptions,
  TextOptions,
} from './types'

// ============================================================================
// Constants
// ============================================================================

/** A4 page dimensions in mm */
export const A4_DIMENSIONS: PageDimensions = {
  width: 210,
  height: 297,
}

/** Default page margins in mm */
export const DEFAULT_MARGINS: PageMargins = {
  top: 20,
  right: 20,
  bottom: 25,
  left: 20,
}

/** White-label color palette (slate theme) */
export const PDF_COLORS = {
  // Headers and primary
  primary: '#1E293B',      // slate-800
  primaryLight: '#334155', // slate-700

  // Text
  text: '#334155',         // slate-700
  textMuted: '#64748B',    // slate-500
  textLight: '#94A3B8',    // slate-400

  // Backgrounds
  background: '#FFFFFF',
  backgroundAlt: '#F8FAFC', // slate-50

  // Borders and dividers
  border: '#E2E8F0',       // slate-200
  divider: '#CBD5E1',      // slate-300

  // White (for dark backgrounds)
  white: '#FFFFFF',
} as const

// ============================================================================
// PDFBuilder Class
// ============================================================================

export class PDFBuilder {
  private doc: jsPDF
  private currentPage: number = 1
  private currentY: number
  private tocEntries: TOCEntry[] = []
  private readonly dimensions: PageDimensions
  private readonly margins: PageMargins

  constructor(options: PDFBuilderOptions = {}) {
    const { pageSize = 'a4', orientation = 'portrait', margins } = options

    this.doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: pageSize,
    })

    this.dimensions = pageSize === 'a4' ? A4_DIMENSIONS : { width: 215.9, height: 279.4 }
    this.margins = { ...DEFAULT_MARGINS, ...margins }
    this.currentY = this.margins.top
  }

  // --------------------------------------------------------------------------
  // Getters
  // --------------------------------------------------------------------------

  get pageWidth(): number {
    return this.dimensions.width
  }

  get pageHeight(): number {
    return this.dimensions.height
  }

  get contentWidth(): number {
    return this.dimensions.width - this.margins.left - this.margins.right
  }

  get contentHeight(): number {
    return this.dimensions.height - this.margins.top - this.margins.bottom
  }

  get currentPageNumber(): number {
    return this.currentPage
  }

  getCurrentY(): number {
    return this.currentY
  }

  setCurrentY(y: number): void {
    this.currentY = y
  }

  getRemainingHeight(): number {
    return this.dimensions.height - this.margins.bottom - this.currentY
  }

  getTocEntries(): TOCEntry[] {
    return [...this.tocEntries]
  }

  getDocument(): jsPDF {
    return this.doc
  }

  // --------------------------------------------------------------------------
  // Page Management
  // --------------------------------------------------------------------------

  addPage(): void {
    this.doc.addPage()
    this.currentPage++
    this.currentY = this.margins.top
  }

  /**
   * Check if content fits on current page, add new page if not
   * @param requiredHeight Height needed in mm
   * @returns true if a new page was added
   */
  ensureSpace(requiredHeight: number): boolean {
    if (this.getRemainingHeight() < requiredHeight) {
      this.addPage()
      return true
    }
    return false
  }

  // --------------------------------------------------------------------------
  // Text Methods
  // --------------------------------------------------------------------------

  addText(text: string, options: TextOptions): void {
    const {
      x,
      y,
      fontSize = 11,
      fontStyle = 'normal',
      color = PDF_COLORS.text,
      align = 'left',
      maxWidth,
    } = options

    this.doc.setFontSize(fontSize)
    this.doc.setFont('helvetica', fontStyle)
    this.doc.setTextColor(color)

    if (maxWidth) {
      this.doc.text(text, x, y, { maxWidth, align })
    } else {
      this.doc.text(text, x, y, { align })
    }
  }

  /**
   * Add wrapped text that respects content width
   * @returns The Y position after the text
   */
  addWrappedText(
    text: string,
    y: number,
    options: Omit<TextOptions, 'x' | 'y'> = {}
  ): number {
    const { fontSize = 11, fontStyle = 'normal', color = PDF_COLORS.text } = options

    this.doc.setFontSize(fontSize)
    this.doc.setFont('helvetica', fontStyle)
    this.doc.setTextColor(color)

    const lines = this.doc.splitTextToSize(text, this.contentWidth)
    this.doc.text(lines, this.margins.left, y)

    // Calculate height used (approximate line height = fontSize * 0.35)
    const lineHeight = fontSize * 0.35
    return y + lines.length * lineHeight
  }

  // --------------------------------------------------------------------------
  // Image Methods
  // --------------------------------------------------------------------------

  /**
   * Add a captured chart image to the PDF
   */
  addImage(
    imageData: string,
    format: 'PNG' | 'JPEG',
    options: ImageOptions
  ): void {
    const { x, y, width, height } = options
    this.doc.addImage(imageData, format, x, y, width, height)
  }

  /**
   * Add a chart canvas, scaling to fit content width while maintaining aspect ratio
   * @returns The Y position after the image
   */
  addChartImage(
    canvas: HTMLCanvasElement,
    title: string,
    startY?: number
  ): number {
    const y = startY ?? this.currentY

    // Calculate dimensions to fit content width
    const aspectRatio = canvas.height / canvas.width
    let imgWidth = this.contentWidth
    let imgHeight = imgWidth * aspectRatio

    // If too tall, scale down
    const maxHeight = this.getRemainingHeight() - 20 // Leave room for title
    if (imgHeight > maxHeight) {
      imgHeight = maxHeight
      imgWidth = imgHeight / aspectRatio
    }

    // Check if we need a new page
    const totalHeight = imgHeight + 15 // Title + spacing
    if (this.getRemainingHeight() < totalHeight) {
      this.addPage()
      return this.addChartImage(canvas, title)
    }

    // Add chart title
    this.addText(title, {
      x: this.margins.left,
      y: y,
      fontSize: 12,
      fontStyle: 'bold',
      color: PDF_COLORS.primary,
    })

    // Add the image
    const imageData = canvas.toDataURL('image/png')
    const imgY = y + 8
    this.doc.addImage(imageData, 'PNG', this.margins.left, imgY, imgWidth, imgHeight)

    this.currentY = imgY + imgHeight + 10
    return this.currentY
  }

  // --------------------------------------------------------------------------
  // Shapes and Lines
  // --------------------------------------------------------------------------

  addLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options: { color?: string; width?: number } = {}
  ): void {
    const { color = PDF_COLORS.divider, width = 0.5 } = options
    this.doc.setDrawColor(color)
    this.doc.setLineWidth(width)
    this.doc.line(x1, y1, x2, y2)
  }

  addHorizontalDivider(y?: number, options: { color?: string } = {}): void {
    const lineY = y ?? this.currentY
    this.addLine(
      this.margins.left,
      lineY,
      this.pageWidth - this.margins.right,
      lineY,
      options
    )
  }

  addRect(
    x: number,
    y: number,
    width: number,
    height: number,
    options: { fill?: string; stroke?: string } = {}
  ): void {
    const { fill, stroke } = options

    if (fill) {
      this.doc.setFillColor(fill)
    }
    if (stroke) {
      this.doc.setDrawColor(stroke)
    }

    if (fill && stroke) {
      this.doc.rect(x, y, width, height, 'FD')
    } else if (fill) {
      this.doc.rect(x, y, width, height, 'F')
    } else {
      this.doc.rect(x, y, width, height, 'S')
    }
  }

  // --------------------------------------------------------------------------
  // TOC Management
  // --------------------------------------------------------------------------

  addTocEntry(title: string, level: 1 | 2 = 1): void {
    this.tocEntries.push({
      title,
      pageNumber: this.currentPage,
      level,
    })
  }

  // --------------------------------------------------------------------------
  // Export Methods
  // --------------------------------------------------------------------------

  async toBlob(): Promise<Blob> {
    return this.doc.output('blob')
  }

  async save(filename: string): Promise<void> {
    this.doc.save(filename)
  }

  getDataUrl(): string {
    return this.doc.output('dataurlstring')
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a sanitized filename from study title
 */
export function createPDFFilename(studyTitle: string): string {
  const sanitized = studyTitle
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50)

  const date = new Date().toISOString().split('T')[0]
  return `${sanitized}_report_${date}.pdf`
}

/**
 * Format study type for display
 */
export function formatStudyType(type: string): string {
  const labels: Record<string, string> = {
    card_sort: 'Card Sort Study',
    tree_test: 'Tree Test Study',
    survey: 'Survey',
  }
  return labels[type] || type
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}
