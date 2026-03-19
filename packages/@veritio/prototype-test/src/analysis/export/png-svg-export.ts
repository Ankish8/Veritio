
import type { ExportOptions } from './export-types'
import { triggerDownload, getHtmlToImageOptions } from './export-utils'

export async function exportToPNG(
  element: HTMLElement,
  options: ExportOptions
): Promise<void> {
  const { toPng } = await import('html-to-image')
  const dataUrl = await toPng(element, getHtmlToImageOptions(options))
  triggerDownload(dataUrl, `${options.filename}.png`)
}

export async function exportToPNGDataUrl(
  element: HTMLElement,
  options: Omit<ExportOptions, 'filename'>
): Promise<string> {
  const { toPng } = await import('html-to-image')
  return toPng(element, getHtmlToImageOptions(options))
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
  const clone = svgElement.cloneNode(true) as SVGElement

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')

  if (!clone.hasAttribute('viewBox')) {
    const bbox = (svgElement as SVGSVGElement).getBBox()
    clone.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`)
  }

  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(clone)

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, `${options.filename}.svg`)
  URL.revokeObjectURL(url)
}
