'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/components/ui/sonner'
import { useInsightsReport } from '@/hooks/use-insights-report'
import {
  Sparkles,
  Loader2,
  Eye,
  AlertTriangle,
  RefreshCw,
  XCircle,
} from 'lucide-react'

interface AiInsightsCardProps {
  studyId: string
  hasResponses: boolean
  segmentFilters?: unknown[]
}

const RAINBOW = 'conic-gradient(from 0deg at 50% 50%, #7c3aed, #2563eb, #06b6d4, #10b981, #f59e0b, #ec4899, #7c3aed)'
const rainbowBg = { background: RAINBOW }

export function AiInsightsCard({
  studyId,
  hasResponses,
  segmentFilters,
}: AiInsightsCardProps) {
  const params = useParams<{ projectId: string }>()
  const router = useRouter()
  const projectId = params.projectId
  const { report, staleCount, isLoading, generate } = useInsightsReport(studyId)
  const [isGenerating, setIsGenerating] = useState(false)
  const prevStatusRef = useRef<string | null>(null)

  const status = report?.status ?? 'none'
  const storageKey = `insights_processing_${studyId}`

  // Toast notification when report completes — works even after navigating away and back
  useEffect(() => {
    const prev = prevStatusRef.current
    prevStatusRef.current = status

    if (status === 'processing') {
      // Persist flag so we can fire the toast after a navigation
      localStorage.setItem(storageKey, '1')
    }

    const wasProcessing = prev === 'processing' || localStorage.getItem(storageKey) === '1'

    if (wasProcessing && status === 'completed') {
      localStorage.removeItem(storageKey)
      toast.success('Your AI Insights Report is ready!', {
        action: {
          label: 'Preview',
          onClick: () => {
            if (report?.id) {
              router.push(`/projects/${projectId}/studies/${studyId}/results/insights?reportId=${report.id}`)
            }
          },
        },
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, report?.id, projectId, studyId, router]) // storageKey omitted — it's derived from studyId above

  const handleGenerate = async (regenerate = false) => {
    if (isGenerating) return
    setIsGenerating(true)
    try {
      await generate({ regenerate, segmentFilters })
      toast.success(
        'Report generation started. You can continue working — we\'ll notify you when it\'s ready.',
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start generation')
    } finally {
      setIsGenerating(false)
    }
  }

  const previewUrl = report?.id
    ? `/projects/${projectId}/studies/${studyId}/results/insights?reportId=${report.id}`
    : null

  const progress = report?.progress

  if (isLoading) {
    return (
      <RainbowCard>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-medium">AI Insights Report</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">Loading...</p>
      </RainbowCard>
    )
  }

  return (
    <RainbowCard>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500 flex-shrink-0" />
            <h4 className="font-medium text-sm sm:text-base">AI Insights Report</h4>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
            {status === 'none' && 'AI-powered analysis with statistical findings, charts, and actionable recommendations.'}
            {status === 'processing' && (
              <>Analyzing: {progress?.currentSection || 'Preparing...'}</>
            )}
            {status === 'completed' && 'Report ready with narrative insights and charts.'}
            {status === 'failed' && (
              <span className="text-destructive">{report?.error_message || 'Generation failed.'}</span>
            )}
          </p>

          {/* Processing state */}
          {status === 'processing' && (
            <div className="mt-3 space-y-1.5">
              <Progress value={progress?.percentage ?? 0} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {progress?.percentage ?? 0}% complete — you can navigate away, we&apos;ll notify you when it&apos;s ready
              </p>
            </div>
          )}

          {/* Stale warning */}
          {status === 'completed' && staleCount > 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              <span>{staleCount} new response{staleCount !== 1 ? 's' : ''} since generation</span>
            </div>
          )}
        </div>

        {/* Action area */}
        <div className="flex-shrink-0">
          {status === 'none' && (
            <GenerateButton
              disabled={!hasResponses || isGenerating}
              loading={isGenerating}
              onClick={() => handleGenerate(false)}
            />
          )}

          {status === 'processing' && (
            <Button variant="outline" size="sm" disabled className="text-xs sm:text-sm">
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Generating...
            </Button>
          )}

          {status === 'completed' && (
            <div className="flex items-center gap-2">
              {previewUrl && (
                <Button variant="outline" size="sm" className="text-xs sm:text-sm" asChild>
                  <a href={previewUrl}>
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    Preview
                  </a>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs sm:text-sm"
                disabled={isGenerating}
                onClick={() => handleGenerate(true)}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Regenerate
              </Button>
            </div>
          )}

          {status === 'failed' && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm"
              disabled={isGenerating}
              onClick={() => handleGenerate(true)}
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5 mr-1.5" />
              )}
              Retry
            </Button>
          )}
        </div>
      </div>
    </RainbowCard>
  )
}

// ---------------------------------------------------------------------------
// Rainbow card wrapper — gradient border with glow
// ---------------------------------------------------------------------------

function RainbowCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative group">
      {/* Glow — sits behind the card, extends slightly outside */}
      <div
        className="absolute -inset-[4px] rounded-[16px] opacity-15 blur-xl group-hover:opacity-35 transition-opacity duration-300"
        style={rainbowBg}
      />
      {/* Gradient border via background + padding trick */}
      <div className="relative rounded-xl p-px z-10" style={rainbowBg}>
        <div className="bg-background rounded-[11px] p-4 sm:p-5">
          {children}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Generate button with rainbow border + glow (same as "Build with AI")
// ---------------------------------------------------------------------------

function GenerateButton({
  disabled,
  loading,
  onClick,
}: {
  disabled: boolean
  loading: boolean
  onClick: () => void
}) {
  return (
    <div className="relative group/btn-wrap">
      <div
        className="absolute -inset-[4px] rounded-[12px] opacity-15 blur-xl group-hover/btn-wrap:opacity-35 transition-opacity duration-300"
        style={rainbowBg}
      />
      <div className="relative rounded-[8px] p-px z-10" style={rainbowBg}>
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          className="group/btn relative overflow-hidden flex h-[30px] items-center gap-1.5 bg-background hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-black rounded-[7px] px-3 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-background disabled:hover:text-current"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full group-hover/btn:animate-[btn-shimmer_0.65s_ease-out_forwards]"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.13), transparent)' }}
          />
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-violet-500 group-hover/btn:text-white dark:group-hover/btn:text-black transition-colors" />
          )}
          Generate Insights
        </button>
      </div>
    </div>
  )
}
