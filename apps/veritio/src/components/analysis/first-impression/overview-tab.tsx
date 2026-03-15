'use client'

/**
 * First Impression Overview Tab
 *
 * Summary metrics and per-design breakdown.
 * Reuses shared components: CompletionDisplay, TimeDisplay, DeviceInfoDisplay.
 */

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Image, Clock, Eye, MessageSquare, Info } from 'lucide-react'

// Shared components
import { CompletionDisplay, TimeDisplay, DeviceInfoDisplay } from '@/components/analysis/shared'

import type { FirstImpressionResultsResponse } from '@/services/results/first-impression'
import { Button } from '@/components/ui/button'

const DESIGN_DISPLAY_LIMIT = 10

interface FirstImpressionOverviewProps {
  data: FirstImpressionResultsResponse
}

export function FirstImpressionOverview({ data }: FirstImpressionOverviewProps) {
  const [showAllDesigns, setShowAllDesigns] = useState(false)
  const { metrics, participants, designs, exposures, sessions } = data

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

  // Total exposures (non-practice)
  const totalExposures = useMemo(
    () => exposures.filter((e: any) => {
      const design = designs.find((d: any) => d.id === e.design_id)
      return design && !design.is_practice
    }).length,
    [exposures, designs]
  )

  // Total questions answered
  const totalResponses = data.responses.length

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Participants Section */}
      <section data-pdf-chart="overview-stats">
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Participants</h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Completion Card */}
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

          {/* Time Taken Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Time taken</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeDisplay
                avgMs={metrics.averageSessionTimeMs}
                times={times}
              />
            </CardContent>
          </Card>

          {/* Device Info Card */}
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
      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Study Metrics Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Study Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
  {/* eslint-disable-next-line jsx-a11y/alt-text */}
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

        {/* Design Distribution Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-sm font-medium">Design Exposure Distribution</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px]">
                  {data.study.settings?.designAssignmentMode === 'sequential_all' ? (
                    <p>
                      With sequential assignment, participants see all designs in order.
                      Earlier designs may have more views if participants drop out before completing all designs.
                    </p>
                  ) : (
                    <p>
                      With random assignment, each participant sees one randomly selected design.
                      Minor variations in distribution are normal due to randomization.
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </div>
            <CardDescription>
              How often each design was shown to participants
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analysisDesigns.length > 0 ? (
              <div className="space-y-3">
                {(showAllDesigns ? analysisDesigns : analysisDesigns.slice(0, DESIGN_DISPLAY_LIMIT)).map((design) => (
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
                {analysisDesigns.length > DESIGN_DISPLAY_LIMIT && (
                  <div className="text-center pt-1">
                    <Button variant="ghost" size="sm" onClick={() => setShowAllDesigns(!showAllDesigns)}>
                      {showAllDesigns ? 'Show less' : `Show all ${analysisDesigns.length} designs`}
                    </Button>
                  </div>
                )}
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
              <>
                <div className="divide-y">
                  {(showAllDesigns ? analysisDesigns : analysisDesigns.slice(0, DESIGN_DISPLAY_LIMIT)).map((design, _index) => (
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
                            {/* eslint-disable-next-line @next/next/no-img-element */}
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
                {analysisDesigns.length > DESIGN_DISPLAY_LIMIT && (
                  <div className="text-center pt-3">
                    <Button variant="ghost" size="sm" onClick={() => setShowAllDesigns(!showAllDesigns)}>
                      {showAllDesigns ? 'Show less' : `Show all ${analysisDesigns.length} designs`}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No designs configured for this study.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
