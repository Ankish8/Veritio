/**
 * PDF Assembler Service
 *
 * Assembles captured chart images into a complete PDF report.
 * Uses the existing PDFBuilder and layout templates from lib/export/pdf.
 */

import {
  PDFBuilder,
  createPDFFilename,
  PDF_COLORS,
  DEFAULT_MARGINS,
} from '../../lib/export/pdf/pdf-builder'
import { renderCoverPage } from '../../lib/export/pdf/layouts/cover-page'
import { renderTableOfContents } from '../../lib/export/pdf/layouts/table-of-contents'
import { renderSectionHeader } from '../../lib/export/pdf/layouts/section-header'
import { addFootersToAllPages } from '../../lib/export/pdf/layouts/page-footer'
import { renderStatsSection } from '../../lib/export/pdf/layouts/stats-section'
import { getSectionById } from '../../lib/export/pdf/section-registry'
import type { CapturedImage, PDFAssemblyOptions } from './types'

// ============================================================================
// Main Assembly Function
// ============================================================================

/**
 * Assemble captured images into a PDF report
 */
export async function assemblePDF(
  images: CapturedImage[],
  options: PDFAssemblyOptions
): Promise<Buffer> {
  const builder = new PDFBuilder()

  // 1. Add cover page
  if (options.includeCoverPage) {
    renderCoverPage(builder, {
      studyTitle: options.studyTitle,
      studyType: options.studyType,
      studyDescription: options.studyDescription,
      participantCount: options.participantCount,
      completionRate: options.completionRate,
      generatedDate: options.branding.generatedDate,
      companyName: options.branding.companyName,
    })
  }

  // 2. Group images by section for organized layout
  const imagesBySection = groupImagesBySection(images)

  // 3. Always add overview section first (it's text-based, no images needed)
  builder.addPage()
  renderSectionHeader(builder, 'Study Overview', { level: 1 })
  renderStatsSection(builder, {
    totalParticipants: options.participantCount,
    completedParticipants: options.completedCount,
    completionRate: options.completionRate,
    studyType: options.studyType,
    ...options.studyMetrics,
  })

  // 4. Add each section with its images
  for (const [sectionId, sectionImages] of Object.entries(imagesBySection)) {
    // Skip overview - already rendered above
    if (sectionId === 'overview') {
      continue
    }

    // Get section definition for title
    const sectionDef = getSectionById(options.studyType, sectionId)
    const sectionTitle = sectionDef?.title || sectionId

    // Add section header
    builder.addPage()
    renderSectionHeader(builder, sectionTitle, {
      level: 1,
      description: sectionDef?.description,
    })

    // Add each image in the section
    for (const image of sectionImages) {
      addImageToBuilder(builder, image)
    }
  }

  // 5. Add table of contents (after all sections so we have page numbers)
  if (options.includeTableOfContents) {
    const tocEntries = builder.getTocEntries()
    renderTableOfContents(builder, tocEntries)
  }

  // 6. Add page footers
  addFootersToAllPages(builder, options.studyTitle, options.includeCoverPage)

  // 7. Export as Buffer
  const doc = builder.getDocument()
  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Group captured images by their section ID
 */
function groupImagesBySection(
  images: CapturedImage[]
): Record<string, CapturedImage[]> {
  const groups: Record<string, CapturedImage[]> = {}

  for (const image of images) {
    // Extract section from image ID (e.g., "dendrogram", "question-uuid")
    const section = extractSection(image.id)

    if (!groups[section]) {
      groups[section] = []
    }
    groups[section].push(image)
  }

  return groups
}

/**
 * Extract section name from image ID
 */
function extractSection(imageId: string): string {
  // Handle question-* format (group all questions under 'responses')
  if (imageId.startsWith('question-')) {
    return 'responses'
  }
  // Handle pietree-* format
  if (imageId.startsWith('pietree-')) {
    return 'pietree'
  }
  // Handle first-click-* format
  if (imageId.startsWith('first-click-')) {
    return 'first-click'
  }
  return imageId
}

/**
 * Add a captured image (Buffer) to the PDF builder
 */
function addImageToBuilder(builder: PDFBuilder, image: CapturedImage): void {
  const doc = builder.getDocument()
  const _currentY = builder.getCurrentY()

  // Convert Buffer to base64 data URL
  const base64 = image.imageData.toString('base64')
  const dataUrl = `data:image/png;base64,${base64}`

  // Calculate dimensions to fit content width
  const contentWidth = builder.contentWidth
  const aspectRatio = image.height / image.width
  let imgWidth = contentWidth
  let imgHeight = imgWidth * aspectRatio

  // Limit max height to leave room on page
  const maxHeight = 180 // mm
  if (imgHeight > maxHeight) {
    imgHeight = maxHeight
    imgWidth = imgHeight / aspectRatio
  }

  // Check if we need a new page
  const requiredHeight = imgHeight + 20 // Image + title + spacing
  if (builder.getRemainingHeight() < requiredHeight) {
    builder.addPage()
  }

  // Add chart title if available
  if (image.title) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(PDF_COLORS.primary)
    doc.text(image.title, DEFAULT_MARGINS.left, builder.getCurrentY())
    builder.setCurrentY(builder.getCurrentY() + 8)
  }

  // Add the image
  doc.addImage(
    dataUrl,
    'PNG',
    DEFAULT_MARGINS.left,
    builder.getCurrentY(),
    imgWidth,
    imgHeight
  )

  builder.setCurrentY(builder.getCurrentY() + imgHeight + 15)
}

// ============================================================================
// Exports
// ============================================================================

export { createPDFFilename }
