/**
 * Puppeteer Capture Service
 *
 * Uses headless Chrome to capture chart screenshots from render pages.
 * Optimized for server-side PDF generation.
 */

import puppeteer, { type Browser } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import type { CaptureOptions, CapturedImage, CaptureProgress } from './types'

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_VIEWPORT = { width: 800, height: 600 }
const DEFAULT_TIMEOUT = 15000 // 15 seconds (fail faster for debugging)
const WAIT_FOR_READY_FUNCTION = 'window.__PDF_READY__ === true'

// ============================================================================
// Browser Management
// ============================================================================

let browserInstance: Browser | null = null

/**
 * Get or create a browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance
  }

  // Check if we're in a serverless environment
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction) {
    // Use @sparticuz/chromium for serverless
    browserInstance = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: DEFAULT_VIEWPORT,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  } else {
    // In development, try to use local Chrome
    const possiblePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
    ]

    let executablePath: string | undefined

    for (const path of possiblePaths) {
      try {
        const fs = await import('fs')
        if (fs.existsSync(path)) {
          executablePath = path
          break
        }
      } catch {
        // Ignore
      }
    }

    browserInstance = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: DEFAULT_VIEWPORT,
      executablePath,
      headless: true,
    })
  }

  return browserInstance
}

/**
 * Close the browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
  }
}

// ============================================================================
// Chart Capture
// ============================================================================

/**
 * Capture a single chart from a URL
 */
export async function captureChart(
  options: CaptureOptions,
  logger?: { info: (msg: string, data?: Record<string, unknown>) => void; warn: (msg: string, data?: Record<string, unknown>) => void; error: (msg: string, data?: Record<string, unknown>) => void }
): Promise<CapturedImage> {
  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    // Set viewport
    await page.setViewport(options.viewport || DEFAULT_VIEWPORT)

    // Navigate to the URL
    await page.goto(options.url, {
      waitUntil: 'networkidle0',
      timeout: options.timeout || DEFAULT_TIMEOUT,
    })

    // Wait for the chart to be ready (with fallback on timeout)
    try {
      if (options.waitForFunction) {
        await page.waitForFunction(options.waitForFunction, {
          timeout: options.timeout || DEFAULT_TIMEOUT,
        })
      } else {
        // Default: wait for our standard ready signal
        await page.waitForFunction(WAIT_FOR_READY_FUNCTION, {
          timeout: options.timeout || DEFAULT_TIMEOUT,
        })
      }
    } catch {
      // If waitForFunction times out, proceed anyway - page might have error state
      logger?.warn(`[Puppeteer] waitForFunction timed out, proceeding with capture`, { url: options.url })
    }

    // Small delay for any final animations
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Take screenshot
    const imageData = await page.screenshot({
      type: 'png',
      fullPage: false,
    })

    // Get page title from the element
    const title = await page.evaluate(() => {
      const titleEl = document.querySelector('[data-pdf-title]')
      return titleEl?.getAttribute('data-pdf-title') || document.title || ''
    })

    // Get chart ID
    const id = await page.evaluate(() => {
      const chartEl = document.querySelector('[data-pdf-chart]')
      return chartEl?.getAttribute('data-pdf-chart') || ''
    })

    const viewport = options.viewport || DEFAULT_VIEWPORT

    return {
      id,
      title,
      imageData: Buffer.from(imageData),
      width: viewport.width,
      height: viewport.height,
    }
  } finally {
    await page.close()
  }
}

/**
 * Capture multiple charts with progress tracking
 */
export async function captureMultipleCharts(
  charts: CaptureOptions[],
  onProgress?: (progress: CaptureProgress) => void,
  logger?: { info: (msg: string, data?: Record<string, unknown>) => void; warn: (msg: string, data?: Record<string, unknown>) => void; error: (msg: string, data?: Record<string, unknown>) => void }
): Promise<CapturedImage[]> {
  const results: CapturedImage[] = []
  const total = charts.length

  for (let i = 0; i < charts.length; i++) {
    const chart = charts[i]

    // Extract section name from URL for progress reporting
    const urlPath = new URL(chart.url).pathname
    const sectionTitle = urlPath.split('/').pop() || `Chart ${i + 1}`

    onProgress?.({
      current: i + 1,
      total,
      stage: `Capturing ${sectionTitle}...`,
      sectionTitle,
    })

    try {
      const captured = await captureChart(chart, logger)
      results.push(captured)
    } catch (error) {
      logger?.error(`Failed to capture chart`, { url: chart.url, error: error instanceof Error ? error.message : String(error) })
      // Continue with other charts even if one fails
    }

    // Small delay between captures to prevent memory issues
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return results
}

/**
 * Build capture URL for a section
 */
export function buildCaptureUrl(
  baseUrl: string,
  studyId: string,
  section: string,
  token: string,
  extraParams?: Record<string, string>
): string {
  const url = new URL(`/render/pdf/${studyId}/${section}`, baseUrl)
  url.searchParams.set('token', token)

  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      url.searchParams.set(key, value)
    }
  }

  return url.toString()
}

/**
 * Build capture options for a section
 */
export function buildCaptureOptions(
  baseUrl: string,
  studyId: string,
  section: string,
  token: string,
  extraParams?: Record<string, string>
): CaptureOptions {
  return {
    url: buildCaptureUrl(baseUrl, studyId, section, token, extraParams),
    viewport: DEFAULT_VIEWPORT,
    waitForFunction: WAIT_FOR_READY_FUNCTION,
    timeout: DEFAULT_TIMEOUT,
  }
}
