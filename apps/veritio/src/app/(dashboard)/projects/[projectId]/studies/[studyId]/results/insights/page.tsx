'use client'

/**
 * AI Insights Report Preview Page
 *
 * Full-page preview rendering the report JSON with narrative sections,
 * charts (via InsightsChartRenderer), key findings, and recommendations.
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/sonner'
import { InsightsChartRenderer } from '@/components/analysis/shared'
import { getAuthFetchInstance } from '@/lib/swr'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft,
  Download,
  Loader2,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
} from 'lucide-react'
import type { InsightsReport, ReportOutput, SectionOutput } from '@/services/insights/chart-schema'

/** Strip leading list markers (-, *, •, numbered) that the LLM includes in array items */
function stripListMarker(text: string): string {
  return text.replace(/^[\s]*(?:[-*•]|\d+[.)]\s)\s*/, '')
}

/** Tailwind classes for markdown content blocks (narratives, executive summary) */
const markdownBlockStyles = 'text-sm text-muted-foreground leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1.5 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground'

/** Inline markdown for list items — unwraps the <p> wrapper */
const inlineMarkdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}

export default function InsightsPreviewPage() {
  const params = useParams<{ projectId: string; studyId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()

  const { projectId, studyId } = params
  const reportId = searchParams.get('reportId')

  const [report, setReport] = useState<InsightsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const printContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!reportId || !studyId) return

    async function loadReport() {
      try {
        const authFetch = getAuthFetchInstance()
        const response = await authFetch(`/api/studies/${studyId}/insights/${reportId}`)
        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to load report')
        }
        const data = await response.json()
        setReport(data.report)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report')
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [studyId, reportId])

  const handleDownload = useCallback(async () => {
    if (isDownloading || !printContentRef.current) return
    setIsDownloading(true)

    try {
      const { exportHtmlToPdf } = await import('@/lib/export/pdf/html-to-pdf')
      await exportHtmlToPdf(printContentRef.current, {
        filename: `insights-report-${studyId}`,
      })
    } catch (err) {
      console.error('PDF export failed:', err)
      toast.error('Failed to generate PDF')
    } finally {
      setIsDownloading(false)
    }
  }, [isDownloading, studyId])

  const handleBack = () => {
    router.push(`/projects/${projectId}/studies/${studyId}/results`)
  }

  if (loading) {
    return <InsightsPreviewSkeleton onBack={handleBack} />
  }

  if (error || !report?.report_data) {
    return (
      <div className="min-h-screen bg-background">
        <StickyHeader onBack={handleBack} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-medium">Unable to load report</h2>
            <p className="text-sm text-muted-foreground">{error || 'Report data is not available.'}</p>
            <Button variant="outline" onClick={handleBack}>Back to Results</Button>
          </div>
        </div>
      </div>
    )
  }

  const reportData = report.report_data as ReportOutput

  return (
    <div className="min-h-screen bg-background">
      <StickyHeader
        onBack={handleBack}
        onDownload={handleDownload}
        isDownloading={isDownloading}
      />

      <div ref={printContentRef} className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Cover section */}
        <div data-pdf-block className="space-y-4 pb-6 border-b">
          <div className="flex items-center gap-2 text-blue-500">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">AI Insights Report</span>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Generated {new Date(report.created_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
              {report.response_count_at_generation > 0 && (
                <> &middot; Based on {report.response_count_at_generation} responses</>
              )}
            </p>
          </div>
        </div>

        {/* Executive summary */}
        {reportData.executiveSummary && (
          <div data-pdf-block className="space-y-3">
            <h2 className="text-xl font-semibold">Executive Summary</h2>
            <div className={markdownBlockStyles}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {reportData.executiveSummary}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Report sections */}
        {reportData.sections.map((section) => (
          <ReportSection key={section.id} section={section} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StickyHeader({
  onBack,
  onDownload,
  isDownloading,
}: {
  onBack: () => void
  onDownload?: () => void
  isDownloading?: boolean
}) {
  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b print:hidden">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Results
        </Button>

        {onDownload && (
          <Button
            variant="outline"
            size="sm"
            disabled={isDownloading}
            onClick={onDownload}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            Download PDF
          </Button>
        )}
      </div>
    </div>
  )
}

function ReportSection({ section }: { section: SectionOutput }) {
  return (
    <div className="space-y-4 pb-6 border-b last:border-b-0">
      {/* Section title + narrative */}
      <div data-pdf-block>
        <h3 className="text-lg font-semibold">{section.title}</h3>
        <div className={`mt-4 ${markdownBlockStyles}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {section.narrative}
          </ReactMarkdown>
        </div>
      </div>

      {/* Charts — each is its own block */}
      {section.charts.length > 0 && (
        <div className="space-y-4">
          {section.charts.map((chart, i) => (
            <div key={i} data-pdf-block className="rounded-lg border p-4">
              <InsightsChartRenderer chart={chart} />
            </div>
          ))}
        </div>
      )}

      {/* Key findings */}
      {section.keyFindings.length > 0 && (
        <div data-pdf-block className="rounded-lg bg-muted/50 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Key Findings
          </div>
          <ul className="list-none space-y-1.5">
            {section.keyFindings.map((finding, i) => (
              <li key={i} className="text-sm text-muted-foreground pl-5 relative before:content-[''] before:absolute before:left-1.5 before:top-2 before:h-1 before:w-1 before:rounded-full before:bg-muted-foreground/40">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={inlineMarkdownComponents}>
                  {stripListMarker(finding)}
                </ReactMarkdown>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {section.recommendations && section.recommendations.length > 0 && (
        <div data-pdf-block className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-blue-700 dark:text-blue-400">
            <Lightbulb className="h-4 w-4" />
            Recommendations
          </div>
          <ul className="list-none space-y-1.5">
            {section.recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-blue-700/80 dark:text-blue-400/80 pl-5 relative before:content-[''] before:absolute before:left-1.5 before:top-2 before:h-1 before:w-1 before:rounded-full before:bg-blue-400/40">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={inlineMarkdownComponents}>
                  {stripListMarker(rec)}
                </ReactMarkdown>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function InsightsPreviewSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-background">
      <StickyHeader onBack={onBack} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3 pb-6 border-b">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
