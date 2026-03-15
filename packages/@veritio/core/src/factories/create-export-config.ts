import type { ExportConfigInput, ExportConfigResult } from './types'
import type { PdfSectionDefinition } from '../types'

export function createExportConfig(config: ExportConfigInput): ExportConfigResult {
  const {
    pdfSections,
    exportToCsv = () => '',
    exportToExcel = () => new Blob(),
    exportToPdf = () => Promise.resolve(new Blob()),
  } = config

  return {
    pdfSections,

    getSections: () => pdfSections,

    getDefaultSections: () =>
      pdfSections.filter((s) => s.isDefault).map((s) => s.id),

    getSectionById: (id: string): PdfSectionDefinition | undefined =>
      pdfSections.find((s) => s.id === id),

    exportToCsv,
    exportToExcel,
    exportToPdf,
  }
}
