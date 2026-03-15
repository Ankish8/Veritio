'use client'

/**
 * Public First Impression Overview
 *
 * Read-only version of the First Impression results overview for public results sharing.
 * Shows participant stats, study metrics, design exposure distribution, and design overview cards.
 */

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Image, Clock, Eye, MessageSquare, HelpCircle } from 'lucide-react'
import { CompletionDisplay, TimeDisplay, DeviceInfoDisplay } from '@/components/analysis/shared'
import type { Participant } from '@veritio/study-types'

interface DesignMetrics {
  designId: string
  designName: string
  imageUrl?: string
  isPractice: boolean
  exposureCount: number
  exposurePercentage: number
  avgExposureDurationMs: number
  avgQuestionTimeMs: number
  questionMetrics: { responseCount: number }[]
}

interface FirstImpressionMetrics {
  totalParticipants: number
  completedParticipants: number
  completionRate: number
  averageSessionTimeMs: number
  designMetrics: DesignMetrics[]
}

interface PublicFirstImpressionOverviewProps {
  metrics: FirstImpressionMetrics
  participants: Participant[]
  sessions: any[]
  exposures: any[]
  designs: any[]
  responses: any[]
}

export function PublicFirstImpressionOverview({
  metrics,
  participants,
  sessions,
  exposures,
  designs,
  responses
}: PublicFirstImpressionOverviewProps) {
  // Filter out practice designs for analysis
  const analysisDesigns = useMemo(
    () => metrics.designMetrics.filter(d => !d.isPractice),
    [metrics.designMetrics]
  )

  // Calculate time stats from sessions for the TimeDisplay component
  const times = useMemo(() => {
    return sessions
      .filter((s: any) => s.total_time_ms && s.total_time_ms > 0)
      .map((s: any) => s.total_time_ms as number)
  }, [sessions])

  const timeMessage = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return "No completion time data available."
    }
    if (times.length === 0) return "Waiting for completion time data."
    return null
  }, [sessions, times])

  // Total exposures (non-practice)
  const totalExposures = useMemo(
    () => exposures.filter((e: any) => {
      const design = designs.find((d: any) => d.id === e.design_id)
      return design && !design.is_practice
    }).length,
    [exposures, designs]
  )

  // Total questions answered
  const totalResponses = responses.length

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Participants Section */}
      <section>
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Participants</h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <CompletionDisplay
                completed={metrics.completedParticipants}
                total={metrics.totalParticipants}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Time taken</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeDisplay avgMs={metrics.averageSessionTimeMs} times={times} />
              {timeMessage && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {timeMessage}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Device Info</CardTitle>
            </CardHeader>
            <CardContent>
              <DeviceInfoDisplay participants={participants as any} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Study Metrics Section */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Study Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  {/* eslint-disable-next-line jsx-a11y/alt-text -- Image is a lucide-react icon */}
                  <Image className="h-4 w-4" />
                  Designs
                </span>
                <span className="text-sm font-medium">{analysisDesigns.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Total Exposures
                </span>
                <span className="text-sm font-medium">{totalExposures}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Questions Answered
                </span>
                <span className="text-sm font-medium">{totalResponses}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Avg. Session Time
                </span>
                <span className="text-sm font-medium">
                  {(metrics.averageSessionTimeMs / 1000).toFixed(1)}s
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Design Exposure Distribution</CardTitle>
            <CardDescription>How often each design was shown to participants</CardDescription>
          </CardHeader>
          <CardContent>
            {analysisDesigns.length > 0 ? (
              <div className="space-y-3">
                {analysisDesigns.map((design) => (
                  <div key={design.designId} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {design.designName}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {design.exposureCount} ({design.exposurePercentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${design.exposurePercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No designs have been shown yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Design Overview Section */}
      <section>
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Design Overview</h2>
        <Card>
          <CardContent className="pt-4">
            {analysisDesigns.length > 0 ? (
              <div className="divide-y">
                {analysisDesigns.map((design) => (
                  <div
                    key={design.designId}
                    className="py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium truncate">{design.designName}</h3>
                          <Badge variant="outline" className="shrink-0">
                            {design.exposureCount} views
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Avg. Exposure</span>
                            <p className="font-medium">
                              {(design.avgExposureDurationMs / 1000).toFixed(1)}s
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Avg. Question Time</span>
                            <p className="font-medium">
                              {design.avgQuestionTimeMs > 0
                                ? `${(design.avgQuestionTimeMs / 1000).toFixed(1)}s`
                                : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Questions</span>
                            <p className="font-medium">{design.questionMetrics.length}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Responses</span>
                            <p className="font-medium">
                              {design.questionMetrics.reduce((sum, q) => sum + q.responseCount, 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                      {design.imageUrl && (
                        <div className="shrink-0 w-20 h-20 rounded border overflow-hidden bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element -- external user-uploaded image URL */}
                          <img
                            src={design.imageUrl}
                            alt={design.designName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <HelpCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No designs configured for this study.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
