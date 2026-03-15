/**
 * Cover Page Layout
 *
 * Professional cover page for PDF reports with study metadata.
 * White-label design using neutral slate color palette.
 */

import type { PDFBuilder } from '../pdf-builder'
import { PDF_COLORS, formatStudyType } from '../pdf-builder'
import type { CoverPageConfig } from '../types'

/**
 * Format a date as "Month D, YYYY" (e.g., "January 15, 2025")
 */
function formatDate(date: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

/**
 * Render a professional cover page
 */
export function renderCoverPage(
  builder: PDFBuilder,
  config: CoverPageConfig
): void {
  const doc = builder.getDocument()
  const pageWidth = builder.pageWidth
  const pageHeight = builder.pageHeight

  // Dark header section (top 35% of page)
  const headerHeight = pageHeight * 0.35
  doc.setFillColor(PDF_COLORS.primary)
  doc.rect(0, 0, pageWidth, headerHeight, 'F')

  // Study title (large, white text)
  doc.setTextColor(PDF_COLORS.white)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')

  // Wrap title if too long
  const maxTitleWidth = pageWidth - 40
  const titleLines = doc.splitTextToSize(config.studyTitle, maxTitleWidth)
  doc.text(titleLines, 20, 50)

  // Study type badge
  const titleHeight = titleLines.length * 10
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(formatStudyType(config.studyType), 20, 55 + titleHeight)

  // "Research Report" subtitle
  doc.setFontSize(12)
  doc.setTextColor('#94A3B8') // slate-400
  doc.text('Research Report', 20, 68 + titleHeight)

  // Study description (if provided)
  if (config.studyDescription) {
    const descY = headerHeight + 30
    doc.setTextColor(PDF_COLORS.text)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')

    const descLines = doc.splitTextToSize(config.studyDescription, maxTitleWidth)
    const maxDescLines = descLines.slice(0, 4) // Limit to 4 lines
    doc.text(maxDescLines, 20, descY)
  }

  // Metadata section (bottom of page)
  const metaStartY = pageHeight - 80

  // Divider line
  doc.setDrawColor(PDF_COLORS.border)
  doc.setLineWidth(0.5)
  doc.line(20, metaStartY - 10, pageWidth - 20, metaStartY - 10)

  // Key metrics in a grid layout
  doc.setTextColor(PDF_COLORS.textMuted)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  // Left column - Labels
  doc.text('Generated', 20, metaStartY)
  doc.text('Participants', 20, metaStartY + 12)
  doc.text('Completion Rate', 20, metaStartY + 24)

  // Left column - Values
  doc.setTextColor(PDF_COLORS.text)
  doc.setFont('helvetica', 'bold')
  doc.text(formatDate(config.generatedDate), 70, metaStartY)
  doc.text(String(config.participantCount), 70, metaStartY + 12)
  doc.text(`${config.completionRate.toFixed(1)}%`, 70, metaStartY + 24)

  // Company name (bottom right, if provided)
  if (config.companyName) {
    doc.setTextColor(PDF_COLORS.primary)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(config.companyName, pageWidth - 20, pageHeight - 20, { align: 'right' })
  }
}
