'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CompletionDisplay, TimeDisplay, DeviceInfoDisplay } from '@/components/analysis/shared'
import type { Participant } from '@veritio/study-types'

interface ParticipantsStatsSectionProps {
  stats: {
    totalParticipants: number
    completedParticipants: number
    avgCompletionTimeMs: number
  }
  participants: Participant[]
}

function computeCompletionTimes(participants: Participant[]): number[] {
  if (!participants || participants.length === 0) return []
  return participants
    .filter(p => p.completed_at && p.started_at)
    .map(p => {
      const start = new Date(p.started_at!).getTime()
      const end = new Date(p.completed_at!).getTime()
      return end - start
    })
    .filter(t => t > 0)
}

function getTimeMessage(participants: Participant[], times: number[]): string | null {
  if (!participants || participants.length === 0) {
    return "Here you'll see how long participants take to complete your survey."
  }
  if (times.length === 0) return 'Waiting for completion time data.'
  return null
}

export function ParticipantsStatsSection({ stats, participants }: ParticipantsStatsSectionProps) {
  const times = useMemo(() => computeCompletionTimes(participants), [participants])
  const timeMessage = useMemo(() => getTimeMessage(participants, times), [participants, times])

  return (
    <section>
      <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Participants</h2>
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <CompletionDisplay
              completed={stats.completedParticipants}
              total={stats.totalParticipants}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Time taken</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeDisplay avgMs={stats.avgCompletionTimeMs} times={times} />
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
            <DeviceInfoDisplay participants={participants as any || []} />
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
