/**
 * HTML-to-PDF export using html2canvas-pro + jsPDF
 *
 * html2canvas-pro is a drop-in fork of html2canvas that supports modern CSS
 * color functions (oklch, lab, oklab, lch) used by Tailwind CSS v4.
 *
 * Renders a DOM element to a high-res canvas, then uses content-aware page
 * breaks based on child element boundaries — never cuts through a chart,
 * key findings box, or other logical block.
 */

import html2canvas from 'html2canvas-pro'
import { jsPDF } from 'jspdf'

interface HtmlToPdfOptions {
  /** Filename for the downloaded PDF (without .pdf extension) */
  filename?: string
  /** Page margin in mm */
  margin?: number
  /** Image quality (0-1) for JPEG compression */
  imageQuality?: number
  /** Scale factor for higher resolution capture */
  scale?: number
}

/** A4 dimensions in mm */
const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297

/**
 * Collect Y break points from the container's content blocks, scaled to
 * canvas pixels. Looks for elements marked with [data-pdf-block], then
 * falls back to direct children. The bottom edge of each block is a
 * safe place to insert a page break.
 */
function getBlockBoundaries(container: HTMLElement, scale: number): number[] {
  const containerRect = container.getBoundingClientRect()
  const breaks: number[] = [0]

  // Prefer explicit markers; fall back to direct children
  let blocks = Array.from(container.querySelectorAll('[data-pdf-block]')) as HTMLElement[]
  if (blocks.length === 0) {
    blocks = Array.from(container.children) as HTMLElement[]
  }

  for (const block of blocks) {
    const rect = block.getBoundingClientRect()
    const bottomPx = (rect.bottom - containerRect.top) * scale
    breaks.push(Math.round(bottomPx))
  }

  // Deduplicate and sort
  return [...new Set(breaks)].sort((a, b) => a - b)
}

/**
 * Given sorted block boundary positions and a max page height,
 * returns the Y positions where each page should start.
 * Pages break at the last block boundary that fits within the page height.
 */
function computePageBreaks(
  boundaries: number[],
  pageHeightPx: number,
  totalHeightPx: number,
): number[] {
  const pageStarts: number[] = [0]
  let currentStart = 0

  while (currentStart < totalHeightPx) {
    const pageEnd = currentStart + pageHeightPx

    if (pageEnd >= totalHeightPx) break // remaining content fits

    // Find the last boundary that fits within this page
    let bestBreak = currentStart
    for (const b of boundaries) {
      if (b <= currentStart) continue
      if (b <= pageEnd) {
        bestBreak = b
      } else {
        break
      }
    }

    if (bestBreak <= currentStart) {
      // No block boundary fits — a single block is taller than a page.
      // Force break at page height (unavoidable cut).
      bestBreak = pageEnd
    }

    pageStarts.push(bestBreak)
    currentStart = bestBreak
  }

  return pageStarts
}

export async function exportHtmlToPdf(
  element: HTMLElement,
  options: HtmlToPdfOptions = {},
): Promise<void> {
  const {
    filename = 'insights-report',
    margin = 12,
    imageQuality = 0.98,
    scale = 2,
  } = options

  // Collect block boundaries BEFORE rendering (needs live DOM layout)
  const boundaries = getBlockBoundaries(element, scale)

  // Render DOM element to canvas
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    logging: false,
    scrollY: 0,
  })

  // Calculate dimensions
  const contentWidthMm = A4_WIDTH_MM - margin * 2
  const contentHeightMm = A4_HEIGHT_MM - margin * 2
  const pxPerMm = canvas.width / contentWidthMm
  const pageHeightPx = contentHeightMm * pxPerMm

  // Compute content-aware page breaks
  const pageStarts = computePageBreaks(boundaries, pageHeightPx, canvas.height)

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  for (let i = 0; i < pageStarts.length; i++) {
    if (i > 0) pdf.addPage()

    const sliceY = pageStarts[i]
    const sliceEnd = i + 1 < pageStarts.length ? pageStarts[i + 1] : canvas.height
    const sliceHeight = sliceEnd - sliceY

    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = sliceHeight

    const ctx = pageCanvas.getContext('2d')!
    ctx.drawImage(
      canvas,
      0, sliceY, canvas.width, sliceHeight,
      0, 0, canvas.width, sliceHeight,
    )

    const imgData = pageCanvas.toDataURL('image/jpeg', imageQuality)
    const sliceHeightMm = sliceHeight / pxPerMm

    pdf.addImage(imgData, 'JPEG', margin, margin, contentWidthMm, sliceHeightMm)
  }

  pdf.save(`${filename}.pdf`)
}
