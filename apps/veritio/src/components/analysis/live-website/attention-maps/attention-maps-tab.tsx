'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, Info } from 'lucide-react'
import type { Participant } from '@veritio/study-types'
import type { LiveWebsiteTask, LiveWebsiteGazeData } from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'

interface AttentionMapsTabProps {
  studyId: string
  tasks: LiveWebsiteTask[]
  participants: Participant[]
  readOnly?: boolean
}

export function AttentionMapsTab({ studyId, tasks, participants, readOnly }: AttentionMapsTabProps) {
  const [filterTaskId, setFilterTaskId] = useState<string>('all')
  const [filterParticipantId, setFilterParticipantId] = useState<string>('all')

  // Disable SWR fetch in readOnly/public mode (no auth available)
  const { data: gazeResponse, isLoading } = useSWR<{ gazeData: LiveWebsiteGazeData[] }>(
    studyId && !readOnly ? `/api/studies/${studyId}/gaze-data` : null,
    { revalidateOnFocus: false }
  )
  const gazeData = useMemo(() => gazeResponse?.gazeData || [], [gazeResponse?.gazeData])

  const participantMap = useMemo(() => {
    const map = new Map<string, Participant & { _index: number }>()
    participants.forEach((p, i) => map.set(p.id, { ...p, _index: i + 1 }))
    return map
  }, [participants])

  const taskMap = useMemo(() => {
    const map = new Map<string, LiveWebsiteTask>()
    for (const t of tasks) map.set(t.id, t)
    return map
  }, [tasks])

  const gazeParticipantIds = useMemo(() => {
    const ids = new Set<string>()
    for (const row of gazeData) {
      if (row.participant_id) ids.add(row.participant_id)
    }
    return Array.from(ids)
  }, [gazeData])

  const filteredData = useMemo(() => {
    let data = gazeData
    if (filterTaskId !== 'all') {
      data = data.filter(d => d.task_id === filterTaskId)
    }
    if (filterParticipantId !== 'all') {
      data = data.filter(d => d.participant_id === filterParticipantId)
    }
    return data
  }, [gazeData, filterTaskId, filterParticipantId])

  const totalPoints = useMemo(() =>
    filteredData.reduce((sum, d) => sum + d.point_count, 0),
  [filteredData])

  const uniqueSessions = useMemo(() =>
    new Set(filteredData.map(d => d.session_id)).size,
  [filteredData])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  if (gazeData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Eye className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium mb-1">No gaze data collected yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Eye tracking gaze data will appear here once participants complete tasks with eye tracking enabled.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="flex items-center gap-6 text-sm">
        <div>
          <span className="text-muted-foreground">Total gaze points:</span>{' '}
          <span className="font-medium">{totalPoints.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Sessions:</span>{' '}
          <span className="font-medium">{uniqueSessions}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Data batches:</span>{' '}
          <span className="font-medium">{filteredData.length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={filterTaskId} onValueChange={setFilterTaskId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by task" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tasks</SelectItem>
            {tasks.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterParticipantId} onValueChange={setFilterParticipantId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by participant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All participants</SelectItem>
            {gazeParticipantIds.map(pid => {
              const p = participantMap.get(pid)
              return (
                <SelectItem key={pid} value={pid}>
                  {p ? `P${p._index}` : pid.slice(0, 8)}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          This is a raw data viewer for verifying eye tracking capture. Each row represents a batch of gaze points
          collected during a participant&apos;s session. Heatmap visualization will be available in a future update.
        </p>
      </div>

      {/* Data table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Participant</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Page URL</TableHead>
              <TableHead className="text-right">Gaze Points</TableHead>
              <TableHead className="text-right">Viewport</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No data matches the current filters
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map(row => {
                const participant = row.participant_id ? participantMap.get(row.participant_id) : null
                const task = row.task_id ? taskMap.get(row.task_id) : null
                let pagePathname = '-'
                if (row.page_url) {
                  try { pagePathname = new URL(row.page_url).pathname } catch { pagePathname = row.page_url }
                }

                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      {participant ? (
                        <span className="text-sm">P{participant._index}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">{row.session_id.slice(0, 12)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {task ? (
                        <span className="text-sm">{task.title}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono truncate max-w-[200px] block" title={row.page_url ?? ''}>
                        {pagePathname}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{row.point_count}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {row.viewport_width && row.viewport_height
                        ? `${row.viewport_width}\u00D7${row.viewport_height}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
