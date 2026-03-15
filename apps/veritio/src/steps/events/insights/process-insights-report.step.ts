import type { StepConfig } from 'motia'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../../lib/motia/types'
import { generateInsightsReport } from '../../../services/insights/report-generator'
import { generateRenderToken } from '../../../services/pdf/render-token'

const inputSchema = z.object({
  reportId: z.string().uuid(),
  studyId: z.string().uuid(),
  studyType: z.string(),
  userId: z.string(),
  segmentFilters: z.array(z.unknown()).optional().default([]),
})

export const config = {
  name: 'ProcessInsightsReport',
  description: 'Background processor for AI insights report generation',
  triggers: [{
    type: 'queue',
    topic: 'insights-report-requested',
    input: inputSchema as any,
    infrastructure: {
      handler: { timeout: 600 },
      queue: { maxRetries: 2 },
    },
  }],
  enqueues: ['insights-report-completed'],
  virtualEnqueues: [{ topic: 'OpenAI API', label: 'generate report' }],
  flows: ['results-analysis'],
} satisfies StepConfig

export const handler = async (
  input: z.infer<typeof inputSchema>,
  { logger, enqueue, streams }: EventHandlerContext,
) => {
  const data = inputSchema.parse(input)
  const supabase = getMotiaSupabaseClient()

  const startTime = Date.now()

  logger.info('Processing insights report', {
    reportId: data.reportId,
    studyId: data.studyId,
    studyType: data.studyType,
  })

  // Helper to update progress in DB and via stream
  const updateProgress = async (percentage: number, currentSection: string) => {
    const progress = { percentage, currentSection }

    // Update DB
    await supabase
      .from('ai_insights_reports' as any)
      .update({ progress, updated_at: new Date().toISOString() })
      .eq('id', data.reportId)

    // Send real-time progress via assistantChat stream
    if (streams?.assistantChat) {
      await (streams.assistantChat as any).send(
        { groupId: data.studyId },
        { type: 'event', data: { type: 'insights_progress', reportId: data.reportId, percentage, currentSection } },
      ).catch(() => {})
    }
  }

  try {
    // Generate report content via LLM
    const result = await generateInsightsReport(supabase, {
      studyId: data.studyId,
      studyType: data.studyType,
      reportId: data.reportId,
      segmentFilters: data.segmentFilters,
      onProgress: ({ percentage, section }) => {
        updateProgress(percentage, section).catch(() => {})
      },
      logger,
    })

    // Generate PDF via Puppeteer
    await updateProgress(92, 'Generating PDF...')
    let filePath: string | null = null

    try {
      filePath = await generatePDF(supabase, data, logger)
    } catch (pdfError) {
      // PDF generation is non-critical — report data is still saved
      logger.error('PDF generation failed (non-critical)', {
        error: pdfError instanceof Error ? pdfError.message : String(pdfError),
      })
    }

    // Update report as completed
    await supabase
      .from('ai_insights_reports' as any)
      .update({
        status: 'completed',
        report_data: result.report,
        file_path: filePath,
        model_used: 'gpt-5',
        token_usage: result.tokenUsage,
        generation_time_ms: result.generationTimeMs,
        progress: { percentage: 100, currentSection: 'Complete' },
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.reportId)

    // Send completion event via stream
    if (streams?.assistantChat) {
      await (streams.assistantChat as any).send(
        { groupId: data.studyId },
        { type: 'event', data: { type: 'insights_complete', reportId: data.reportId, hasFile: !!filePath } },
      ).catch(() => {})
    }

    enqueue({
      topic: 'insights-report-completed',
      data: {
        reportId: data.reportId,
        studyId: data.studyId,
        userId: data.userId,
        generationTimeMs: result.generationTimeMs,
      },
    }).catch(() => {})

    logger.info('Insights report completed', {
      reportId: data.reportId,
      timeMs: Date.now() - startTime,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Insights report generation failed', {
      reportId: data.reportId,
      error: errorMessage,
    })

    // Mark report as failed
    await supabase
      .from('ai_insights_reports' as any)
      .update({
        status: 'failed',
        error_message: errorMessage,
        progress: { percentage: 0, currentSection: 'Failed' },
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.reportId)

    // Send failure event via stream
    if (streams?.assistantChat) {
      await (streams.assistantChat as any).send(
        { groupId: data.studyId },
        { type: 'event', data: { type: 'insights_failed', reportId: data.reportId, error: errorMessage } },
      ).catch(() => {})
    }
  }
}

// ---------------------------------------------------------------------------
// PDF Generation helper
// ---------------------------------------------------------------------------

async function generatePDF(
  supabase: ReturnType<typeof getMotiaSupabaseClient>,
  data: { reportId: string; studyId: string; studyType: string; userId: string },
  logger: { info: (msg: string, ctx?: Record<string, unknown>) => void; error: (msg: string, ctx?: Record<string, unknown>) => void },
): Promise<string | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4001'

  // Generate render token for Puppeteer to access the hidden render page
  const token = await generateRenderToken({
    studyId: data.studyId,
    userId: data.userId,
    sections: ['insights'],
    studyType: data.studyType as any,
  })

  const renderUrl = `${baseUrl}/render/insights/${data.reportId}?token=${token}`

  // Dynamic import to avoid bundling puppeteer in non-PDF paths
  const { default: puppeteer } = await import('puppeteer-core')
  const chromium = await import('@sparticuz/chromium')

  const isProduction = process.env.NODE_ENV === 'production'
  let browser

  if (isProduction) {
    browser = await puppeteer.launch({
      args: chromium.default.args,
      defaultViewport: { width: 1200, height: 800 },
      executablePath: await chromium.default.executablePath(),
      headless: true,
    })
  } else {
    const possiblePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
    ]
    let executablePath: string | undefined
    const fs = await import('fs')
    for (const path of possiblePaths) {
      if (fs.existsSync(path)) { executablePath = path; break }
    }
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1200, height: 800 },
      executablePath,
      headless: true,
    })
  }

  try {
    const page = await browser.newPage()
    await page.goto(renderUrl, { waitUntil: 'networkidle0', timeout: 60000 })

    // Wait for charts to render
    await page.waitForFunction('window.__PDF_READY__ === true', { timeout: 30000 })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    })

    // Upload to Supabase Storage
    const storagePath = `studies/${data.studyId}/insights/${data.reportId}.pdf`

    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      logger.error('Failed to upload PDF to storage', { error: uploadError.message })
      return null
    }

    logger.info('PDF uploaded to storage', { path: storagePath })
    return storagePath
  } finally {
    await browser.close()
  }
}
