'use client'

import { useState, useMemo, memo } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ArrowUpDown, Info } from 'lucide-react'
import { computePageStats, truncateUrl, type PageStats } from './utils'
import type {
  LiveWebsiteEvent,
  LiveWebsiteTask,
} from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'
import type { Participant } from '@veritio/study-types'

type SortKey = 'frictionScore' | 'visits' | 'clicks' | 'rageClicks' | 'avgScrollDepth'

const COLUMN_TOOLTIPS: Record<string, string> = {
  visits: 'Number of times this page was navigated to.',
  clicks: 'Total click events recorded on this page.',
  rageClicks: 'Rapid repeated clicks on the same area, indicating frustration or a non-responsive element.',
  avgScrollDepth: 'Average percentage of the page scrolled by participants.',
  frictionScore: 'Combined score (0-100) based on rage click frequency and low scroll depth. Higher = more friction.',
}

interface PageActivityViewProps {
  events: LiveWebsiteEvent[]
  tasks: LiveWebsiteTask[]
  participants: Participant[]
  onSelectPage: (url: string) => void
}

function PageActivityViewBase({
  events,
  tasks,
  onSelectPage,
}: PageActivityViewProps) {
  const [taskFilter, setTaskFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('frictionScore')
  const [sortAsc, setSortAsc] = useState(false)

  const filteredEvents = useMemo(() => {
    if (taskFilter === 'all') return events
    return events.filter(e => e.task_id === taskFilter)
  }, [events, taskFilter])

  const pageStats = useMemo(() => computePageStats(filteredEvents), [filteredEvents])

  const sortedStats = useMemo(() => {
    return [...pageStats].sort((a, b) => {
      const aVal = (a[sortKey] ?? -1) as number
      const bVal = (b[sortKey] ?? -1) as number
      return sortAsc ? aVal - bVal : bVal - aVal
    })
  }, [pageStats, sortKey, sortAsc])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  if (pageStats.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">No page activity data available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {tasks.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Task</label>
          <Select value={taskFilter} onValueChange={setTaskFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tasks</SelectItem>
              {tasks.map((task, i) => (
                <SelectItem key={task.id} value={task.id}>
                  {i + 1}. {task.title || `Task ${i + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-2.5 font-medium">Page URL</th>
                <SortableHeader
                  label="Visits"
                  sortKey="visits"
                  currentSort={sortKey}
                  ascending={sortAsc}
                  onSort={handleSort}
                  tooltip={COLUMN_TOOLTIPS.visits}
                />
                <SortableHeader
                  label="Clicks"
                  sortKey="clicks"
                  currentSort={sortKey}
                  ascending={sortAsc}
                  onSort={handleSort}
                  tooltip={COLUMN_TOOLTIPS.clicks}
                />
                <SortableHeader
                  label="Rage Clicks"
                  sortKey="rageClicks"
                  currentSort={sortKey}
                  ascending={sortAsc}
                  onSort={handleSort}
                  tooltip={COLUMN_TOOLTIPS.rageClicks}
                />
                <SortableHeader
                  label="Avg Scroll"
                  sortKey="avgScrollDepth"
                  currentSort={sortKey}
                  ascending={sortAsc}
                  onSort={handleSort}
                  tooltip={COLUMN_TOOLTIPS.avgScrollDepth}
                />
                <SortableHeader
                  label="Friction"
                  sortKey="frictionScore"
                  currentSort={sortKey}
                  ascending={sortAsc}
                  onSort={handleSort}
                  tooltip={COLUMN_TOOLTIPS.frictionScore}
                />
                <th className="text-right px-4 py-2.5 font-medium">Participants</th>
              </tr>
            </thead>
            <tbody>
              {sortedStats.map(stat => (
                <PageRow key={stat.pageUrl} stat={stat} onSelectPage={onSelectPage} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const FRICTION_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  high: 'bg-red-100 text-red-800 border-red-200',
}

const PageRow = memo(function PageRow({
  stat,
  onSelectPage,
}: {
  stat: PageStats
  onSelectPage: (url: string) => void
}) {
  return (
    <tr
      className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer"
      onClick={() => onSelectPage(stat.pageUrl)}
    >
      <td className="px-4 py-2.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block max-w-[300px] text-primary hover:underline">
                {truncateUrl(stat.pageUrl, 50)}
              </span>
            </TooltipTrigger>
            {stat.pageUrl.length > 50 && (
              <TooltipContent className="max-w-md break-all">
                {stat.pageUrl}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums">{stat.visits}</td>
      <td className="px-4 py-2.5 text-right tabular-nums">{stat.clicks}</td>
      <td className="px-4 py-2.5 text-right tabular-nums">{stat.rageClicks}</td>
      <td className="px-4 py-2.5 text-right tabular-nums">
        {stat.avgScrollDepth !== null ? `${stat.avgScrollDepth}%` : '-'}
      </td>
      <td className="px-4 py-2.5 text-right">
        <Badge variant="outline" className={FRICTION_COLORS[stat.frictionLevel]}>
          {stat.frictionScore}
        </Badge>
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums">{stat.uniqueParticipants}</td>
    </tr>
  )
})

function SortableHeader({
  label,
  sortKey,
  currentSort,
  ascending: _ascending,
  onSort,
  tooltip,
}: {
  label: string
  sortKey: SortKey
  currentSort: SortKey
  ascending: boolean
  onSort: (key: SortKey) => void
  tooltip?: string
}) {
  const isActive = currentSort === sortKey
  return (
    <th
      className="text-right px-4 py-2.5 font-medium cursor-pointer select-none hover:bg-muted/50"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px]">
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <ArrowUpDown className={`h-3 w-3 ${isActive ? 'opacity-100' : 'opacity-30'}`} />
      </span>
    </th>
  )
}

export const PageActivityView = memo(PageActivityViewBase)
