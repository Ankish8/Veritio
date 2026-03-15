/**
 * Section Header Layout
 *
 * Renders section titles with consistent styling and dividers.
 */

import type { PDFBuilder } from '../pdf-builder'
import { PDF_COLORS } from '../pdf-builder'

/**
 * Render a section header
 * @returns The Y position after the header
 */
export function renderSectionHeader(
  builder: PDFBuilder,
  title: string,
  options: {
    level?: 1 | 2
    addToToc?: boolean
    description?: string
  } = {}
): number {
  const { level = 1, addToToc = true, description } = options
  const doc = builder.getDocument()
  const margins = { left: 20, right: 20 }
  const pageWidth = builder.pageWidth

  // Check if we need a new page (need at least 60mm for header + some content)
  const requiredSpace = level === 1 ? 60 : 40
  if (builder.getRemainingHeight() < requiredSpace) {
    builder.addPage()
  }

  let y = builder.getCurrentY()

  // Add to TOC
  if (addToToc) {
    builder.addTocEntry(title, level)
  }

  if (level === 1) {
    // Level 1: Full section header with divider

    // Top divider line
    doc.setDrawColor(PDF_COLORS.divider)
    doc.setLineWidth(0.5)
    doc.line(margins.left, y, pageWidth - margins.right, y)

    y += 12

    // Section title
    doc.setTextColor(PDF_COLORS.primary)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(title, margins.left, y)

    y += 8

    // Description if provided
    if (description) {
      doc.setTextColor(PDF_COLORS.textMuted)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const descLines = doc.splitTextToSize(description, builder.contentWidth)
      doc.text(descLines.slice(0, 2), margins.left, y) // Max 2 lines
      y += descLines.slice(0, 2).length * 4 + 4
    }

    y += 8

  } else {
    // Level 2: Subsection header (smaller, no divider)

    y += 6

    doc.setTextColor(PDF_COLORS.primaryLight)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(title, margins.left, y)

    y += 10
  }

  builder.setCurrentY(y)
  return y
}

/**
 * Render a simple text label (for chart titles, etc.)
 */
export function renderLabel(
  builder: PDFBuilder,
  text: string,
  options: {
    fontSize?: number
    bold?: boolean
    color?: string
  } = {}
): number {
  const { fontSize = 11, bold = false, color = PDF_COLORS.text } = options
  const doc = builder.getDocument()
  const y = builder.getCurrentY()

  doc.setTextColor(color)
  doc.setFontSize(fontSize)
  doc.setFont('helvetica', bold ? 'bold' : 'normal')
  doc.text(text, 20, y)

  const newY = y + fontSize * 0.4 + 4
  builder.setCurrentY(newY)
  return newY
}
