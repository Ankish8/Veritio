/**
 * PDF Service
 *
 * Server-side PDF generation using Puppeteer for chart capture.
 */

// Types
export * from './types'

// Token management
export { generateRenderToken, validateRenderToken, isSectionAllowed, isStudyAllowed } from './render-token'

// Puppeteer capture
export {
  captureChart,
  captureMultipleCharts,
  closeBrowser,
  buildCaptureUrl,
  buildCaptureOptions,
} from './puppeteer-capture'

// PDF assembly
export { assemblePDF, createPDFFilename } from './pdf-assembler'
