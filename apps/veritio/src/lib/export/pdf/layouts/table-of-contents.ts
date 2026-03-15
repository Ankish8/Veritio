/**
 * Table of Contents Layout
 *
 * Generates a professional TOC with dotted leaders and page numbers.
 */

import type { PDFBuilder } from '../pdf-builder'
import { PDF_COLORS } from '../pdf-builder'
import type { TOCEntry } from '../types'

/**
 * Render the table of contents page
 */
export function renderTableOfContents(
  builder: PDFBuilder,
  entries: TOCEntry[]
): void {
  const doc = builder.getDocument()
  const margins = { left: 20, right: 20 }
  const pageWidth = builder.pageWidth

  builder.addPage()
  let y = 30

  // TOC Title
  doc.setTextColor(PDF_COLORS.primary)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Table of Contents', margins.left, y)

  y += 20

  // Divider line under title
  doc.setDrawColor(PDF_COLORS.border)
  doc.setLineWidth(0.5)
  doc.line(margins.left, y, pageWidth - margins.right, y)

  y += 15

  // TOC entries
  doc.setFontSize(11)

  entries.forEach((entry) => {
    const indent = entry.level === 1 ? 0 : 12

    // Entry title
    doc.setFont('helvetica', entry.level === 1 ? 'bold' : 'normal')
    doc.setTextColor(PDF_COLORS.text)
    doc.text(entry.title, margins.left + indent, y)

    // Page number (right-aligned)
    const pageNumStr = String(entry.pageNumber)
    doc.setTextColor(PDF_COLORS.textMuted)
    doc.text(pageNumStr, pageWidth - margins.right, y, { align: 'right' })

    // Dotted leader line
    const titleWidth = doc.getTextWidth(entry.title)
    const pageNumWidth = doc.getTextWidth(pageNumStr)
    const leaderStart = margins.left + indent + titleWidth + 5
    const leaderEnd = pageWidth - margins.right - pageNumWidth - 5

    if (leaderEnd > leaderStart + 10) {
      doc.setDrawColor(PDF_COLORS.border)
      doc.setLineDashPattern([1, 2], 0)
      doc.line(leaderStart, y - 1, leaderEnd, y - 1)
      doc.setLineDashPattern([], 0) // Reset to solid
    }

    y += entry.level === 1 ? 10 : 8

    // Check for page break
    if (y > builder.pageHeight - 40) {
      builder.addPage()
      y = 30
    }
  })

  builder.setCurrentY(y)
}

/**
 * Update TOC page numbers after all content is added
 * This is called at the end to insert correct page numbers
 */
export function updateTocPageNumbers(
  _builder: PDFBuilder,
  _tocPageNumber: number,
  _entries: TOCEntry[]
): void {
  // jsPDF doesn't support modifying pages after creation easily
  // The TOC is rendered with correct page numbers from addTocEntry calls
  // This function is kept for potential future enhancements
}
