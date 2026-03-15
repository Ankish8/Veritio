'use client'

import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Download, Loader2, Sparkles, Lightbulb, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InsightsChartRenderer } from '@/components/analysis/shared/insights/insights-chart-renderer'

/** Strip leading list markers (-, *, •, numbered) that the LLM includes in array items */
function stripListMarker(text: string): string {
  return text.replace(/^[\s]*(?:[-*•]|\d+[.)]\s)\s*/, '')
}

/** Tailwind classes for markdown content blocks */
const markdownBlockStyles = 'text-sm text-muted-foreground leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1.5 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground'

/** Inline markdown for list items — unwraps the <p> wrapper */
const inlineMarkdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}

interface ChartConfig {
  type: string
  title: string
  xKey: string
  yKeys: string[]
  data: Record<string, unknown>[]
  xLabel?: string
  yLabel?: string
  colors?: string[]
}

interface ReportSection {
  id: string
  title: string
  narrative: string
  keyFindings: string[]
  charts: ChartConfig[]
  recommendations: string[]
}

interface ReportOutput {
  executiveSummary: string
  sections: ReportSection[]
}

interface PublicInsightsSectionProps {
  reportData: ReportOutput
  reportId: string
  hasFilePath: boolean
  token: string
}

export function PublicInsightsSection({
  reportData,
  reportId: _reportId,
  hasFilePath: _hasFilePath,
  token: _token,
}: PublicInsightsSectionProps) {
  const [downloading, setDownloading] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleDownload = async () => {
    if (downloading || !contentRef.current) return
    setDownloading(true)
    try {
      const { exportHtmlToPdf } = await import('@/lib/export/pdf/html-to-pdf')
      await exportHtmlToPdf(contentRef.current, {
        filename: `insights-report`,
      })
    } catch {
      // Silently fail — download button will reset
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* PDF-captured content */}
      <div ref={contentRef} className="space-y-6">
        {/* Executive Summary */}
        <div data-pdf-block className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold">Executive Summary</h3>
          </div>
          <div className={markdownBlockStyles}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {reportData.executiveSummary}
            </ReactMarkdown>
          </div>
        </div>

        {/* Sections */}
        {reportData.sections.map((section) => (
          <div key={section.id} className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
            {/* Title + narrative */}
            <div data-pdf-block>
              <h3 className="text-base font-semibold mb-3">{section.title}</h3>
              <div className={`${markdownBlockStyles} mb-4`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {section.narrative}
                </ReactMarkdown>
              </div>
            </div>

            {/* Key Findings */}
            {section.keyFindings && section.keyFindings.length > 0 && (
              <div data-pdf-block className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  <h4 className="text-sm font-medium">Key Findings</h4>
                </div>
                <ul className="[&_li]:mb-1 [&_li]:last:mb-0 list-disc pl-6 text-sm text-muted-foreground">
                  {section.keyFindings.map((finding, i) => (
                    <li key={i}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={inlineMarkdownComponents}>
                        {stripListMarker(finding)}
                      </ReactMarkdown>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Charts */}
            {section.charts && section.charts.length > 0 && (
              <div className="mb-4 space-y-4">
                {section.charts.map((chart, i) => (
                  <div key={i} data-pdf-block>
                    <InsightsChartRenderer chart={chart as any} />
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {section.recommendations && section.recommendations.length > 0 && (
              <div data-pdf-block>
                <div className="flex items-center gap-1.5 mb-2">
                  <FileText className="h-3.5 w-3.5 text-blue-500" />
                  <h4 className="text-sm font-medium">Recommendations</h4>
                </div>
                <ul className="[&_li]:mb-1 [&_li]:last:mb-0 list-disc pl-6 text-sm text-muted-foreground">
                  {section.recommendations.map((rec, i) => (
                    <li key={i}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={inlineMarkdownComponents}>
                        {stripListMarker(rec)}
                      </ReactMarkdown>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer — excluded from PDF capture */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          Generated by AI analysis
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5 mr-1.5" />
          )}
          Download PDF
        </Button>
      </div>
    </div>
  )
}
