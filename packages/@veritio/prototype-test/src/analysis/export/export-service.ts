
import { jsPDF } from 'jspdf'
import type { PrototypeTaskMetrics } from '@veritio/prototype-test/algorithms/prototype-test-analysis'
import type { AdvancedTaskMetrics } from '@veritio/prototype-test/algorithms/advanced-metrics'


export interface ExportOptions {
  filename: string
  backgroundColor?: string
  pixelRatio?: number
  includeMetadata?: boolean
}

export interface PDFReportData {
  studyTitle: string
  studyDescription?: string
  exportDate: Date
  taskMetrics: PrototypeTaskMetrics[]
  advancedMetrics?: Map<string, AdvancedTaskMetrics>
  participantCount: number
  overallSuccessRate: number
  overview: {
    totalResponses: number
    completionRate: number
    averageTimeMs: number
  }
}

export interface CSVExportData {
  headers: string[]
  rows: (string | number | boolean | null | undefined)[][]
}


const PDF_COLORS = {
  primary: '#1f2937',      // gray-800
  secondary: '#6b7280',    // gray-500
  success: '#059669',      // emerald-600
  warning: '#d97706',      // amber-600
  danger: '#dc2626',       // red-600
  border: '#e5e7eb',       // gray-200
  background: '#f9fafb',   // gray-50
}

const PDF_MARGINS = {
  top: 20,
  right: 20,
  bottom: 20,
  left: 20,
}


export async function exportToPNG(
  element: HTMLElement,
  options: ExportOptions
): Promise<void> {
  const { toPng } = await import('html-to-image')

  const dataUrl = await toPng(element, {
    backgroundColor: options.backgroundColor ?? '#ffffff',
    pixelRatio: options.pixelRatio ?? 2,
    skipFonts: true,
    filter: (node) => {
      // Skip animated elements that might cause issues
      if (node instanceof Element) {
        return !node.classList?.contains('animate-spin')
      }
      return true
    },
  })

  triggerDownload(dataUrl, `${options.filename}.png`)
}

export async function exportToPNGDataUrl(
  element: HTMLElement,
  options: Omit<ExportOptions, 'filename'>
): Promise<string> {
  const { toPng } = await import('html-to-image')

  return toPng(element, {
    backgroundColor: options.backgroundColor ?? '#ffffff',
    pixelRatio: options.pixelRatio ?? 2,
    skipFonts: true,
    filter: (node) => {
      if (node instanceof Element) {
        return !node.classList?.contains('animate-spin')
      }
      return true
    },
  })
}


export async function exportToSVG(
  element: HTMLElement,
  options: ExportOptions
): Promise<void> {
  const { toSvg } = await import('html-to-image')

  const dataUrl = await toSvg(element, {
    backgroundColor: options.backgroundColor ?? '#ffffff',
    skipFonts: true,
    filter: (node) => {
      if (node instanceof Element) {
        return !node.classList?.contains('animate-spin')
      }
      return true
    },
  })

  triggerDownload(dataUrl, `${options.filename}.svg`)
}

export function exportSVGElement(
  svgElement: SVGElement,
  options: ExportOptions
): void {
  // Clone the SVG to avoid modifying the original
  const clone = svgElement.cloneNode(true) as SVGElement

  // Ensure the SVG has proper namespace
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')

  // Add viewBox if not present
  if (!clone.hasAttribute('viewBox')) {
    const bbox = (svgElement as SVGSVGElement).getBBox()
    clone.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`)
  }

  // Serialize to string
  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(clone)

  // Create blob and download
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, `${options.filename}.svg`)
  URL.revokeObjectURL(url)
}


function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''

  const str = String(value)

  // Prefix formula characters to prevent injection attacks
  const formulaChars = ['=', '+', '-', '@', '\t', '\r']
  const needsFormulaPrefix = formulaChars.some(char => str.startsWith(char))

  // Check if value needs quoting
  const needsQuoting = str.includes(',') || str.includes('"') || str.includes('\n') || needsFormulaPrefix

  if (needsQuoting) {
    const escaped = str.replace(/"/g, '""')
    return needsFormulaPrefix ? `"'${escaped}"` : `"${escaped}"`
  }

  return str
}

export function exportToCSV(data: CSVExportData, filename: string): void {
  const csvContent = [
    data.headers.map(escapeCsvValue).join(','),
    ...data.rows.map(row => row.map(escapeCsvValue).join(',')),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, `${filename}.csv`)
  URL.revokeObjectURL(url)
}

export function exportTaskMetricsToCSV(
  metrics: PrototypeTaskMetrics,
  studyTitle: string,
  advancedMetrics?: AdvancedTaskMetrics
): void {
  const timestamp = new Date().toISOString().slice(0, 10)
  const sanitizedTask = metrics.taskTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
  const filename = `task-results-${sanitizedTask}-${timestamp}`

  const rows: (string | number)[][] = [
    ['Study', studyTitle],
    ['Task', metrics.taskTitle],
    ['Task Instruction', metrics.taskInstruction || ''],
    [],
    ['Metric', 'Value', 'Additional Info'],
    [],
    ['Responses', metrics.responseCount],
    [],
    ['-- Outcomes --'],
    ['Success Count', metrics.successCount, `${metrics.successRate.toFixed(1)}%`],
    ['Failure Count', metrics.failureCount, `${metrics.failureRate.toFixed(1)}%`],
    ['Skipped Count', metrics.skippedCount, `${metrics.skippedRate.toFixed(1)}%`],
    [],
    ['-- Success Breakdown --'],
    ['Direct Success', metrics.statusBreakdown?.success.direct || 0],
    ['Indirect Success', metrics.statusBreakdown?.success.indirect || 0],
    [],
    ['-- Key Metrics --'],
    ['Success Rate', `${metrics.successRate.toFixed(1)}%`, `95% CI: ${metrics.successCI?.lowerBound?.toFixed(1) || 0}% - ${metrics.successCI?.upperBound?.toFixed(1) || 0}%`],
    ['Directness Rate', `${metrics.directRate.toFixed(1)}%`, `95% CI: ${metrics.directnessCI?.lowerBound?.toFixed(1) || 0}% - ${metrics.directnessCI?.upperBound?.toFixed(1) || 0}%`],
    ['Average Time', formatTime(metrics.averageTimeMs), `${metrics.averageTimeMs.toFixed(0)}ms`],
    ['Misclick Rate', `${metrics.misclickRate.toFixed(1)}%`],
    ['Task Score', `${metrics.taskScore.toFixed(1)}/10`, '(Success × 3 + Directness) / 4'],
    [],
    ['-- Click Statistics --'],
    ['Average Clicks', metrics.averageClickCount.toFixed(1)],
    ['Average Misclicks', metrics.averageMisclickCount.toFixed(1)],
    ['Average Backtracks', metrics.averageBacktrackCount.toFixed(1)],
    [],
    ['-- Time Distribution --'],
    ['Min', formatTime(metrics.timeBoxPlot?.min || 0)],
    ['Q1 (25th percentile)', formatTime(metrics.timeBoxPlot?.q1 || 0)],
    ['Median', formatTime(metrics.timeBoxPlot?.median || 0)],
    ['Q3 (75th percentile)', formatTime(metrics.timeBoxPlot?.q3 || 0)],
    ['Max', formatTime(metrics.timeBoxPlot?.max || 0)],
    ['Outliers', metrics.timeBoxPlot?.outliers?.length || 0],
  ]

  // Add advanced metrics if available
  if (advancedMetrics) {
    rows.push(
      [],
      ['-- Advanced Metrics --'],
      ['Lostness Score', advancedMetrics.lostness.score.toFixed(3), advancedMetrics.lostness.interpretation],
      ['Path Efficiency', `${advancedMetrics.pathEfficiency.score.toFixed(1)}%`],
      ['Confusion Points', advancedMetrics.dwellTime.confusionPoints.length],
    )

    if (advancedMetrics.dwellTime.confusionPoints.length > 0) {
      rows.push([], ['-- Confusion Points --'])
      advancedMetrics.dwellTime.confusionPoints.forEach((cp, i) => {
        rows.push([`${i + 1}. ${cp.frameName}`, `${cp.dwellTimeMs.toFixed(0)}ms avg`, `${cp.ratio.toFixed(1)}x threshold`])
      })
    }
  }

  exportToCSV({
    headers: [],
    rows: rows as (string | number | boolean | null | undefined)[][],
  }, filename)
}

export function exportAllTasksToCSV(
  taskMetrics: PrototypeTaskMetrics[],
  studyTitle: string
): void {
  const timestamp = new Date().toISOString().slice(0, 10)
  const sanitizedStudy = studyTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
  const filename = `all-tasks-${sanitizedStudy}-${timestamp}`

  const headers = [
    'Task',
    'Responses',
    'Success Rate (%)',
    'Directness Rate (%)',
    'Avg Time (ms)',
    'Avg Clicks',
    'Avg Misclicks',
    'Avg Backtracks',
    'Task Score',
  ]

  const rows = taskMetrics.map(m => [
    m.taskTitle,
    m.responseCount,
    m.successRate.toFixed(1),
    m.directRate.toFixed(1),
    m.averageTimeMs.toFixed(0),
    m.averageClickCount.toFixed(1),
    m.averageMisclickCount.toFixed(1),
    m.averageBacktrackCount.toFixed(1),
    m.taskScore.toFixed(1),
  ])

  exportToCSV({ headers, rows }, filename)
}


export async function generatePDFReport(
  data: PDFReportData,
  options: ExportOptions,
  capturedImages?: Map<string, string>
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const contentWidth = pageWidth - PDF_MARGINS.left - PDF_MARGINS.right

  let y = PDF_MARGINS.top

  // -------------------------------------------------------------------------
  // Title Page
  // -------------------------------------------------------------------------
  pdf.setFontSize(24)
  pdf.setTextColor(PDF_COLORS.primary)
  pdf.text(data.studyTitle, pageWidth / 2, y + 20, { align: 'center' })

  pdf.setFontSize(12)
  pdf.setTextColor(PDF_COLORS.secondary)
  pdf.text('Prototype Test Results Report', pageWidth / 2, y + 30, { align: 'center' })

  pdf.setFontSize(10)
  pdf.text(`Generated: ${data.exportDate.toLocaleDateString()}`, pageWidth / 2, y + 40, { align: 'center' })

  if (data.studyDescription) {
    pdf.setFontSize(10)
    pdf.setTextColor(PDF_COLORS.secondary)
    const descLines = pdf.splitTextToSize(data.studyDescription, contentWidth - 40)
    pdf.text(descLines, pageWidth / 2, y + 55, { align: 'center' })
  }

  // -------------------------------------------------------------------------
  // Overview Section
  // -------------------------------------------------------------------------
  y = y + 80

  pdf.setFontSize(16)
  pdf.setTextColor(PDF_COLORS.primary)
  pdf.text('Overview', PDF_MARGINS.left, y)

  y += 10

  // Overview stats in a grid
  const overviewStats = [
    { label: 'Participants', value: data.participantCount.toString() },
    { label: 'Total Responses', value: data.overview.totalResponses.toString() },
    { label: 'Completion Rate', value: `${data.overview.completionRate.toFixed(1)}%` },
    { label: 'Overall Success Rate', value: `${data.overallSuccessRate.toFixed(1)}%` },
    { label: 'Avg. Time', value: formatTime(data.overview.averageTimeMs) },
    { label: 'Tasks', value: data.taskMetrics.length.toString() },
  ]

  const statBoxWidth = contentWidth / 3
  const statBoxHeight = 20

  overviewStats.forEach((stat, index) => {
    const col = index % 3
    const row = Math.floor(index / 3)
    const boxX = PDF_MARGINS.left + (col * statBoxWidth)
    const boxY = y + (row * (statBoxHeight + 5))

    // Box background
    pdf.setFillColor(PDF_COLORS.background)
    pdf.rect(boxX, boxY, statBoxWidth - 5, statBoxHeight, 'F')

    // Value
    pdf.setFontSize(14)
    pdf.setTextColor(PDF_COLORS.primary)
    pdf.text(stat.value, boxX + 5, boxY + 8)

    // Label
    pdf.setFontSize(9)
    pdf.setTextColor(PDF_COLORS.secondary)
    pdf.text(stat.label, boxX + 5, boxY + 15)
  })

  y += Math.ceil(overviewStats.length / 3) * (statBoxHeight + 5) + 15

  // -------------------------------------------------------------------------
  // Task Summary Table
  // -------------------------------------------------------------------------
  pdf.setFontSize(16)
  pdf.setTextColor(PDF_COLORS.primary)
  pdf.text('Task Summary', PDF_MARGINS.left, y)

  y += 10

  // Table header
  const tableHeaders = ['Task', 'Success', 'Directness', 'Avg Time', 'Score']
  const colWidths = [contentWidth * 0.35, contentWidth * 0.15, contentWidth * 0.15, contentWidth * 0.15, contentWidth * 0.15]

  pdf.setFillColor(PDF_COLORS.primary)
  pdf.rect(PDF_MARGINS.left, y, contentWidth, 8, 'F')

  pdf.setFontSize(9)
  pdf.setTextColor('#ffffff')
  let headerX = PDF_MARGINS.left + 2
  tableHeaders.forEach((header, i) => {
    pdf.text(header, headerX, y + 5.5)
    headerX += colWidths[i]
  })

  y += 8

  // Table rows
  pdf.setTextColor(PDF_COLORS.primary)
  data.taskMetrics.forEach((task, index) => {
    // Check for page break
    if (y > pageHeight - 40) {
      pdf.addPage()
      y = PDF_MARGINS.top
    }

    // Alternating row background
    if (index % 2 === 0) {
      pdf.setFillColor(PDF_COLORS.background)
      pdf.rect(PDF_MARGINS.left, y, contentWidth, 7, 'F')
    }

    let cellX = PDF_MARGINS.left + 2
    const rowData = [
      truncateText(task.taskTitle, 40),
      `${task.successRate.toFixed(1)}%`,
      `${task.directRate.toFixed(1)}%`,
      formatTime(task.averageTimeMs),
      `${task.taskScore.toFixed(1)}/10`,
    ]

    pdf.setFontSize(8)
    rowData.forEach((cell, i) => {
      // Color-code success and score
      if (i === 1) {
        pdf.setTextColor(getSuccessColor(task.successRate))
      } else if (i === 4) {
        pdf.setTextColor(getScoreColor(task.taskScore))
      } else {
        pdf.setTextColor(PDF_COLORS.primary)
      }
      pdf.text(cell, cellX, y + 5)
      cellX += colWidths[i]
    })

    y += 7
  })

  // -------------------------------------------------------------------------
  // Individual Task Details
  // -------------------------------------------------------------------------
  data.taskMetrics.forEach((task, taskIndex) => {
    // New page for each task
    pdf.addPage()
    y = PDF_MARGINS.top

    pdf.setFontSize(14)
    pdf.setTextColor(PDF_COLORS.primary)
    pdf.text(`Task ${taskIndex + 1}: ${task.taskTitle}`, PDF_MARGINS.left, y)

    y += 8

    if (task.taskInstruction) {
      pdf.setFontSize(9)
      pdf.setTextColor(PDF_COLORS.secondary)
      const instrLines = pdf.splitTextToSize(task.taskInstruction, contentWidth)
      pdf.text(instrLines, PDF_MARGINS.left, y)
      y += instrLines.length * 4 + 5
    }

    // Metrics grid
    const taskStats = [
      { label: 'Responses', value: task.responseCount.toString() },
      { label: 'Success Rate', value: `${task.successRate.toFixed(1)}%`, color: getSuccessColor(task.successRate) },
      { label: 'Directness', value: `${task.directRate.toFixed(1)}%` },
      { label: 'Task Score', value: `${task.taskScore.toFixed(1)}/10`, color: getScoreColor(task.taskScore) },
      { label: 'Avg Time', value: formatTime(task.averageTimeMs) },
      { label: 'Misclick Rate', value: `${task.misclickRate.toFixed(1)}%` },
    ]

    const smallStatWidth = contentWidth / 3
    const smallStatHeight = 18

    taskStats.forEach((stat, index) => {
      const col = index % 3
      const row = Math.floor(index / 3)
      const boxX = PDF_MARGINS.left + (col * smallStatWidth)
      const boxY = y + (row * (smallStatHeight + 3))

      pdf.setFillColor(PDF_COLORS.background)
      pdf.rect(boxX, boxY, smallStatWidth - 3, smallStatHeight, 'F')

      pdf.setFontSize(12)
      pdf.setTextColor(stat.color || PDF_COLORS.primary)
      pdf.text(stat.value, boxX + 3, boxY + 7)

      pdf.setFontSize(8)
      pdf.setTextColor(PDF_COLORS.secondary)
      pdf.text(stat.label, boxX + 3, boxY + 14)
    })

    y += Math.ceil(taskStats.length / 3) * (smallStatHeight + 3) + 10

    // Add advanced metrics if available
    const advMetrics = data.advancedMetrics?.get(task.taskId)
    if (advMetrics) {
      pdf.setFontSize(11)
      pdf.setTextColor(PDF_COLORS.primary)
      pdf.text('Advanced Metrics', PDF_MARGINS.left, y)
      y += 6

      pdf.setFontSize(9)

      // Lostness
      const lostnessColor = getLostnessColor(advMetrics.lostness.score)
      pdf.setTextColor(lostnessColor)
      pdf.text(`Lostness: ${advMetrics.lostness.score.toFixed(3)} (${advMetrics.lostness.interpretation})`, PDF_MARGINS.left, y)
      y += 5

      // Path Efficiency
      const effColor = getEfficiencyColor(advMetrics.pathEfficiency.score)
      pdf.setTextColor(effColor)
      pdf.text(`Path Efficiency: ${advMetrics.pathEfficiency.score.toFixed(1)}%`, PDF_MARGINS.left, y)
      y += 5

      // Confusion Points
      if (advMetrics.dwellTime.confusionPoints.length > 0) {
        pdf.setTextColor(PDF_COLORS.warning)
        pdf.text(`Confusion Points: ${advMetrics.dwellTime.confusionPoints.length}`, PDF_MARGINS.left, y)
        y += 4
        pdf.setFontSize(8)
        pdf.setTextColor(PDF_COLORS.secondary)
        advMetrics.dwellTime.confusionPoints.slice(0, 3).forEach(cp => {
          pdf.text(`  • ${cp.frameName}: ${cp.dwellTimeMs.toFixed(0)}ms (${cp.ratio.toFixed(1)}x avg)`, PDF_MARGINS.left, y)
          y += 4
        })
      }
    }

    // Add captured image if available
    const imageKey = `task-${task.taskId}`
    const imageData = capturedImages?.get(imageKey)
    if (imageData && y < pageHeight - 80) {
      try {
        pdf.addImage(imageData, 'PNG', PDF_MARGINS.left, y + 5, contentWidth, 60)
        y += 70
      } catch {
        // Image addition failed, skip silently
      }
    }
  })

  // -------------------------------------------------------------------------
  // Footer on each page
  // -------------------------------------------------------------------------
  const pageCount = pdf.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i)
    pdf.setFontSize(8)
    pdf.setTextColor(PDF_COLORS.secondary)
    pdf.text(
      `Page ${i} of ${pageCount} | Generated by VeriTio`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }

  // Save the PDF
  pdf.save(`${options.filename}.pdf`)
}


export async function exportHeatmapComposite(
  containerElement: HTMLElement,
  frameName: string,
  taskTitle?: string
): Promise<void> {
  const timestamp = new Date().toISOString().slice(0, 10)
  const sanitizedFrame = frameName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
  const sanitizedTask = taskTitle
    ? taskTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    : null

  const filename = sanitizedTask
    ? `heatmap-${sanitizedTask}-${sanitizedFrame}-${timestamp}`
    : `heatmap-${sanitizedFrame}-${timestamp}`

  await exportToPNG(containerElement, { filename })
}

export async function exportFlowDiagram(
  svgContainer: HTMLElement,
  format: 'svg' | 'png',
  studyTitle: string,
  taskTitle?: string
): Promise<void> {
  const timestamp = new Date().toISOString().slice(0, 10)
  const sanitizedStudy = studyTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
  const sanitizedTask = taskTitle
    ? taskTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    : 'all-tasks'

  const filename = `flow-diagram-${sanitizedStudy}-${sanitizedTask}-${timestamp}`

  if (format === 'svg') {
    const svgElement = svgContainer.querySelector('svg')
    if (svgElement) {
      exportSVGElement(svgElement, { filename })
    } else {
      // Fallback to html-to-image SVG export
      await exportToSVG(svgContainer, { filename })
    }
  } else {
    await exportToPNG(svgContainer, { filename, pixelRatio: 2 })
  }
}


function triggerDownload(url: string, filename: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function formatTime(ms: number): string {
  if (ms === 0) return '0s'
  if (ms < 1000) return `${Math.round(ms)}ms`

  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)

  if (remainingSeconds === 0) return `${minutes}m`
  return `${minutes}m ${remainingSeconds}s`
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

function getSuccessColor(rate: number): string {
  if (rate >= 80) return PDF_COLORS.success
  if (rate >= 60) return PDF_COLORS.warning
  return PDF_COLORS.danger
}

function getScoreColor(score: number): string {
  if (score >= 8) return PDF_COLORS.success
  if (score >= 6) return PDF_COLORS.warning
  return PDF_COLORS.danger
}

function getLostnessColor(score: number): string {
  if (score <= 0.3) return PDF_COLORS.success
  if (score <= 0.6) return PDF_COLORS.warning
  return PDF_COLORS.danger
}

function getEfficiencyColor(score: number): string {
  if (score >= 80) return PDF_COLORS.success
  if (score >= 50) return PDF_COLORS.warning
  return PDF_COLORS.danger
}
