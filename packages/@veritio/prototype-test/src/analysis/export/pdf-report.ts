
import { jsPDF } from 'jspdf'
import type { PDFReportData, ExportOptions } from './export-types'
import { PDF_COLORS, PDF_MARGINS } from './export-types'
import { formatTime, truncateText, getRateColor } from './export-utils'

const SUCCESS_THRESHOLDS = { good: 80, warning: 60 }
const SCORE_THRESHOLDS = { good: 8, warning: 6 }
const LOSTNESS_THRESHOLDS = { good: 0.3, warning: 0.6 }
const EFFICIENCY_THRESHOLDS = { good: 80, warning: 50 }

function renderTitlePage(
  pdf: jsPDF,
  data: PDFReportData,
  pageWidth: number,
  contentWidth: number,
  startY: number,
): number {
  let y = startY

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

  return y + 80
}

function renderOverviewSection(
  pdf: jsPDF,
  data: PDFReportData,
  contentWidth: number,
  startY: number,
): number {
  let y = startY

  pdf.setFontSize(16)
  pdf.setTextColor(PDF_COLORS.primary)
  pdf.text('Overview', PDF_MARGINS.left, y)

  y += 10

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

    pdf.setFillColor(PDF_COLORS.background)
    pdf.rect(boxX, boxY, statBoxWidth - 5, statBoxHeight, 'F')

    pdf.setFontSize(14)
    pdf.setTextColor(PDF_COLORS.primary)
    pdf.text(stat.value, boxX + 5, boxY + 8)

    pdf.setFontSize(9)
    pdf.setTextColor(PDF_COLORS.secondary)
    pdf.text(stat.label, boxX + 5, boxY + 15)
  })

  return y + Math.ceil(overviewStats.length / 3) * (statBoxHeight + 5) + 15
}

function renderTaskSummaryTable(
  pdf: jsPDF,
  data: PDFReportData,
  contentWidth: number,
  pageHeight: number,
  startY: number,
): number {
  let y = startY

  pdf.setFontSize(16)
  pdf.setTextColor(PDF_COLORS.primary)
  pdf.text('Task Summary', PDF_MARGINS.left, y)

  y += 10

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

  pdf.setTextColor(PDF_COLORS.primary)
  data.taskMetrics.forEach((task, index) => {
    if (y > pageHeight - 40) {
      pdf.addPage()
      y = PDF_MARGINS.top
    }

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
      if (i === 1) {
        pdf.setTextColor(getRateColor(task.successRate, SUCCESS_THRESHOLDS))
      } else if (i === 4) {
        pdf.setTextColor(getRateColor(task.taskScore, SCORE_THRESHOLDS))
      } else {
        pdf.setTextColor(PDF_COLORS.primary)
      }
      pdf.text(cell, cellX, y + 5)
      cellX += colWidths[i]
    })

    y += 7
  })

  return y
}

function renderTaskDetailPage(
  pdf: jsPDF,
  data: PDFReportData,
  task: PDFReportData['taskMetrics'][number],
  taskIndex: number,
  contentWidth: number,
  pageHeight: number,
  capturedImages?: Map<string, string>,
): void {
  pdf.addPage()
  let y = PDF_MARGINS.top

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
    { label: 'Success Rate', value: `${task.successRate.toFixed(1)}%`, color: getRateColor(task.successRate, SUCCESS_THRESHOLDS) },
    { label: 'Directness', value: `${task.directRate.toFixed(1)}%` },
    { label: 'Task Score', value: `${task.taskScore.toFixed(1)}/10`, color: getRateColor(task.taskScore, SCORE_THRESHOLDS) },
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

  // Advanced metrics
  const advMetrics = data.advancedMetrics?.get(task.taskId)
  if (advMetrics) {
    pdf.setFontSize(11)
    pdf.setTextColor(PDF_COLORS.primary)
    pdf.text('Advanced Metrics', PDF_MARGINS.left, y)
    y += 6

    pdf.setFontSize(9)

    const lostnessColor = getRateColor(advMetrics.lostness.score, LOSTNESS_THRESHOLDS, true)
    pdf.setTextColor(lostnessColor)
    pdf.text(`Lostness: ${advMetrics.lostness.score.toFixed(3)} (${advMetrics.lostness.interpretation})`, PDF_MARGINS.left, y)
    y += 5

    const effColor = getRateColor(advMetrics.pathEfficiency.score, EFFICIENCY_THRESHOLDS)
    pdf.setTextColor(effColor)
    pdf.text(`Path Efficiency: ${advMetrics.pathEfficiency.score.toFixed(1)}%`, PDF_MARGINS.left, y)
    y += 5

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

  // Captured image
  const imageKey = `task-${task.taskId}`
  const imageData = capturedImages?.get(imageKey)
  if (imageData && y < pageHeight - 80) {
    try {
      pdf.addImage(imageData, 'PNG', PDF_MARGINS.left, y + 5, contentWidth, 60)
    } catch {
      // Image addition failed, skip silently
    }
  }
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

  y = renderTitlePage(pdf, data, pageWidth, contentWidth, y)
  y = renderOverviewSection(pdf, data, contentWidth, y)
  renderTaskSummaryTable(pdf, data, contentWidth, pageHeight, y)

  data.taskMetrics.forEach((task, taskIndex) => {
    renderTaskDetailPage(pdf, data, task, taskIndex, contentWidth, pageHeight, capturedImages)
  })

  // Footer on each page
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

  pdf.save(`${options.filename}.pdf`)
}
