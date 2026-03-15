'use client'

import { Eye, Clock, MessageSquare, Image } from 'lucide-react'

interface PublicFirstImpressionAnalysisProps {
  designs: any[]
  sessions: any[]
  exposures: any[]
  participants: any[]
  metrics: any
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  return `${minutes}m ${remainingSeconds}s`
}

export function PublicFirstImpressionAnalysis({
  designs,
  sessions,
  exposures,
  participants,
  metrics: _metrics,
}: PublicFirstImpressionAnalysisProps) {
  if (!designs || designs.length === 0) {
    return (
      <div className="rounded-lg border bg-card shadow-sm p-6">
        <p className="text-sm text-muted-foreground">No design data available.</p>
      </div>
    )
  }

  const designStats = designs.map((design) => {
    const designExposures = exposures.filter(
      (e: any) => e.design_id === design.id
    )
    const totalViewingTime = designExposures.reduce(
      (sum: number, e: any) => sum + (e.viewing_time_ms || 0),
      0
    )
    const avgViewingTime =
      designExposures.length > 0
        ? totalViewingTime / designExposures.length
        : 0

    const responseSessions = sessions.filter((s: any) =>
      designExposures.some((e: any) => e.session_id === s.id)
    )

    return {
      id: design.id,
      title: design.title || design.name || `Design ${designs.indexOf(design) + 1}`,
      imageUrl: design.image_url,
      exposureCount: designExposures.length,
      avgViewingTime,
      responseCount: responseSessions.length,
      isPractice: design.is_practice || false,
    }
  })

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="border-b px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image className="h-4 w-4 text-muted-foreground" aria-hidden={true} />
          <h3 className="text-base font-semibold">Design Results</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {participants.length} participant{participants.length !== 1 ? 's' : ''} across {designs.length} design{designs.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="divide-y">
        {designStats.map((stat) => (
          <div key={stat.id} className="px-4 py-4 sm:px-6 flex items-start gap-4">
            {stat.imageUrl && (
              <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={stat.imageUrl}
                  alt={stat.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium truncate">{stat.title}</h4>
                {stat.isPractice && (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Practice
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {stat.exposureCount} exposure{stat.exposureCount !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatTime(stat.avgViewingTime)} avg
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {stat.responseCount} response{stat.responseCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
