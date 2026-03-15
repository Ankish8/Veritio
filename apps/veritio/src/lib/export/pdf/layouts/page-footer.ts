/**
 * Page Footer Layout
 *
 * Renders page numbers and study title at the bottom of each page.
 */

import type { PDFBuilder } from '../pdf-builder'
import { PDF_COLORS, truncateText } from '../pdf-builder'

/**
 * Render page footer on a single page
 */
export function renderPageFooter(
  builder: PDFBuilder,
  pageNumber: number,
  totalPages: number,
  studyTitle: string
): void {
  const doc = builder.getDocument()
  const pageWidth = builder.pageWidth
  const pageHeight = builder.pageHeight
  const margins = { left: 20, right: 20 }
  const footerY = pageHeight - 12

  // Subtle divider line
  doc.setDrawColor(PDF_COLORS.border)
  doc.setLineWidth(0.3)
  doc.line(margins.left, footerY - 5, pageWidth - margins.right, footerY - 5)

  // Page number (centered)
  doc.setTextColor(PDF_COLORS.textLight)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`${pageNumber} / ${totalPages}`, pageWidth / 2, footerY, {
    align: 'center',
  })

  // Study title (left, truncated)
  const truncatedTitle = truncateText(studyTitle, 40)
  doc.text(truncatedTitle, margins.left, footerY)
}

/**
 * Add footers to all pages in the document
 * Call this at the very end, before saving
 */
export function addFootersToAllPages(
  builder: PDFBuilder,
  studyTitle: string,
  skipFirstPage: boolean = true
): void {
  const doc = builder.getDocument()
  const totalPages = doc.getNumberOfPages()

  for (let i = 1; i <= totalPages; i++) {
    // Skip cover page if requested
    if (skipFirstPage && i === 1) continue

    doc.setPage(i)
    renderPageFooter(builder, i, totalPages, studyTitle)
  }
}
