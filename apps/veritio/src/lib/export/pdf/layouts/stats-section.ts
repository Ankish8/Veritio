/**
 * Stats Section Layout
 *
 * Renders participant statistics and study metrics directly in PDF
 * without requiring DOM chart capture.
 */

import { PDFBuilder, PDF_COLORS } from '../pdf-builder'

interface StudyStats {
  totalParticipants: number
  completedParticipants: number
  completionRate: number
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click'
  // Optional metrics
  totalCards?: number
  totalCategories?: number
  totalTasks?: number
  totalQuestions?: number
  averageTimeMinutes?: number
  successRate?: number
  directnessRate?: number
}

/**
 * Render the study overview stats section
 * This creates a visual stats display directly in the PDF
 */
export function renderStatsSection(
  builder: PDFBuilder,
  stats: StudyStats
): number {
  const doc = builder.getDocument()
  const margins = { left: 20, right: 20 }
  const _pageWidth = builder.pageWidth
  const _contentWidth = builder.contentWidth

  let y = builder.getCurrentY()

  // Participant Stats Box
  y = renderStatsBox(builder, y, 'Participation Summary', [
    { label: 'Total Participants', value: stats.totalParticipants.toString() },
    { label: 'Completed', value: stats.completedParticipants.toString() },
    {
      label: 'Completion Rate',
      value: `${stats.completionRate.toFixed(1)}%`,
      highlight: stats.completionRate >= 80 ? 'success' : stats.completionRate >= 50 ? 'warning' : 'danger'
    },
  ])

  y += 10

  // Study-specific stats
  if (stats.studyType === 'card_sort') {
    y = renderStatsBox(builder, y, 'Study Configuration', [
      { label: 'Cards', value: (stats.totalCards || 0).toString() },
      { label: 'Categories', value: (stats.totalCategories || 0).toString() },
    ])
  } else if (stats.studyType === 'tree_test') {
    const taskStats = [
      { label: 'Tasks', value: (stats.totalTasks || 0).toString() },
    ]
    if (stats.successRate !== undefined) {
      taskStats.push({
        label: 'Success Rate',
        value: `${stats.successRate.toFixed(1)}%`,
        highlight: stats.successRate >= 80 ? 'success' : stats.successRate >= 50 ? 'warning' : 'danger'
      } as { label: string; value: string; highlight?: 'success' | 'warning' | 'danger' })
    }
    if (stats.directnessRate !== undefined) {
      taskStats.push({
        label: 'Directness Rate',
        value: `${stats.directnessRate.toFixed(1)}%`,
      } as { label: string; value: string })
    }
    y = renderStatsBox(builder, y, 'Task Performance', taskStats)
  } else if (stats.studyType === 'survey') {
    y = renderStatsBox(builder, y, 'Survey Details', [
      { label: 'Questions', value: (stats.totalQuestions || 0).toString() },
    ])
  }

  // Average time if available
  if (stats.averageTimeMinutes !== undefined && stats.averageTimeMinutes > 0) {
    y += 10
    doc.setTextColor(PDF_COLORS.textMuted)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Average completion time: ${formatDuration(stats.averageTimeMinutes)}`,
      margins.left,
      y
    )
    y += 8
  }

  builder.setCurrentY(y)
  return y
}

/**
 * Render a stats box with label-value pairs
 */
function renderStatsBox(
  builder: PDFBuilder,
  startY: number,
  title: string,
  items: Array<{ label: string; value: string; highlight?: 'success' | 'warning' | 'danger' }>
): number {
  const doc = builder.getDocument()
  const margins = { left: 20 }
  const boxWidth = builder.contentWidth
  const _itemWidth = Math.min(boxWidth / items.length, 80)

  let y = startY

  // Box title
  doc.setTextColor(PDF_COLORS.textMuted)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(title.toUpperCase(), margins.left, y)
  y += 6

  // Draw box background
  const boxHeight = 45
  doc.setFillColor(PDF_COLORS.backgroundAlt)
  doc.setDrawColor(PDF_COLORS.border)
  doc.roundedRect(margins.left, y, boxWidth, boxHeight, 2, 2, 'FD')

  // Render each stat item
  const startX = margins.left + 15
  items.forEach((item, index) => {
    const x = startX + (index * (boxWidth / items.length))

    // Value (large)
    doc.setTextColor(PDF_COLORS.primary)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text(item.value, x, y + 22)

    // Label (small)
    doc.setTextColor(PDF_COLORS.textMuted)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(item.label, x, y + 32)
  })

  return y + boxHeight + 5
}

/**
 * Format duration in minutes to human readable
 */
function formatDuration(minutes: number): string {
  if (minutes < 1) {
    return 'Less than a minute'
  } else if (minutes < 60) {
    return `${Math.round(minutes)} minute${Math.round(minutes) !== 1 ? 's' : ''}`
  } else {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
  }
}
