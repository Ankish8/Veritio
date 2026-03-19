
import type { ExportOptions } from './export-types'
import { exportToPNG, exportToSVG, exportSVGElement } from './png-svg-export'
import { createTimestampedFilename } from './export-utils'

export async function exportHeatmapComposite(
  containerElement: HTMLElement,
  frameName: string,
  taskTitle?: string
): Promise<void> {
  const filename = createTimestampedFilename('heatmap', taskTitle, frameName)
  await exportToPNG(containerElement, { filename })
}

export async function exportFlowDiagram(
  svgContainer: HTMLElement,
  format: 'svg' | 'png',
  studyTitle: string,
  taskTitle?: string
): Promise<void> {
  const filename = createTimestampedFilename('flow-diagram', studyTitle, taskTitle ?? 'all-tasks')

  if (format === 'svg') {
    const svgElement = svgContainer.querySelector('svg')
    if (svgElement) {
      exportSVGElement(svgElement, { filename })
    } else {
      await exportToSVG(svgContainer, { filename })
    }
  } else {
    await exportToPNG(svgContainer, { filename, pixelRatio: 2 })
  }
}
