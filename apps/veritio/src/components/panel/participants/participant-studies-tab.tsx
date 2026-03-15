'use client'

/**
 * Participant Studies Tab
 *
 * Shows list of study participations in a clean table format with status, source, and dates.
 */

import { memo } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { useCurrentOrganizationId } from '@/stores/collaboration-store'
import { format, formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ClipboardList,
  Clock,
  ExternalLink,
  CheckCircle2,
  PlayCircle,
  XCircle,
  AlertCircle,
  SendHorizontal,
  Globe,
  Mail,
  Link2,
  UserPlus,
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
} from 'lucide-react'

import type { PanelStudyParticipationWithDetails } from '@/lib/supabase/panel-types'

interface ParticipantStudiesTabProps {
  participantId: string
}

// Status configuration with appropriate icons
const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
  invited: {
    icon: <SendHorizontal className="h-3.5 w-3.5" />,
    label: 'Invited',
    className: 'text-muted-foreground bg-muted',
  },
  started: {
    icon: <PlayCircle className="h-3.5 w-3.5" />,
    label: 'In Progress',
    className: 'text-blue-600 bg-blue-50',
  },
  completed: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: 'Completed',
    className: 'text-green-600 bg-green-50',
  },
  abandoned: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: 'Abandoned',
    className: 'text-orange-600 bg-orange-50',
  },
  screened_out: {
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    label: 'Screened Out',
    className: 'text-red-600 bg-red-50',
  },
}

// Source configuration with appropriate icons
const SOURCE_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  widget: { icon: <Globe className="h-3.5 w-3.5" />, label: 'Widget' },
  email: { icon: <Mail className="h-3.5 w-3.5" />, label: 'Email' },
  link: { icon: <Link2 className="h-3.5 w-3.5" />, label: 'Link' },
  direct: { icon: <UserPlus className="h-3.5 w-3.5" />, label: 'Direct' },
}

// Device type icons
const DEVICE_ICONS: Record<string, React.ReactNode> = {
  Desktop: <Monitor className="h-3.5 w-3.5" />,
  Mobile: <Smartphone className="h-3.5 w-3.5" />,
  Tablet: <Tablet className="h-3.5 w-3.5" />,
}

// Type for browser data stored in participant metadata
interface BrowserData {
  browser?: string
  operatingSystem?: string
  deviceType?: 'Desktop' | 'Mobile' | 'Tablet'
  language?: string
  timeZone?: string
  screenResolution?: string
}

// Extended participation type with study participant data
interface ExtendedParticipation extends PanelStudyParticipationWithDetails {
  study_participant?: {
    id: string
    metadata: { browserData?: BrowserData } | null
    country: string | null
    region: string | null
    city: string | null
  } | null
}

export const ParticipantStudiesTab = memo(function ParticipantStudiesTab({
  participantId,
}: ParticipantStudiesTabProps) {
  const organizationId = useCurrentOrganizationId()
  const { data: participations, isLoading } = useSWR<ExtendedParticipation[]>(
    participantId && organizationId ? `/api/panel/participants/${participantId}/participations?organizationId=${organizationId}` : null
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 rounded" />
        ))}
      </div>
    )
  }

  if (!participations || participations.length === 0) {
    return (
      <div className="py-12 text-center">
        <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-medium mb-1">No Study Participations</h3>
        <p className="text-sm text-muted-foreground">
          This participant hasn&apos;t been invited to any studies yet.
        </p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead>Study</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Source</TableHead>
              <TableHead className="hidden lg:table-cell">Device</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Duration</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participations.map((participation) => {
              const statusConfig = STATUS_CONFIG[participation.status] || STATUS_CONFIG.invited
              const sourceConfig = participation.source ? SOURCE_CONFIG[participation.source] : null
              const completionTime = participation.completion_time_seconds
                ? formatDuration(participation.completion_time_seconds)
                : null

              // Get the most relevant date based on status
              const relevantDate = participation.completed_at
                || participation.started_at
                || participation.invited_at

              return (
                <TableRow key={participation.id}>
                  {/* Study Name + Type */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{participation.study.title}</span>
                      <Badge variant="outline" className="text-xs capitalize shrink-0">
                        {participation.study.study_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </div>
                  </TableCell>

                  {/* Source */}
                  <TableCell className="hidden sm:table-cell">
                    {sourceConfig ? (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        {sourceConfig.icon}
                        <span>{sourceConfig.label}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Device Info */}
                  <TableCell className="hidden lg:table-cell">
                    {(() => {
                      const browserData = participation.study_participant?.metadata?.browserData
                      const location = participation.study_participant
                      if (!browserData && !location?.country) {
                        return <span className="text-muted-foreground">—</span>
                      }
                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-default">
                              {browserData?.deviceType && DEVICE_ICONS[browserData.deviceType]}
                              <span>{browserData?.browser || browserData?.deviceType || 'Unknown'}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <div className="space-y-1">
                              {browserData?.browser && (
                                <div>Browser: {browserData.browser}</div>
                              )}
                              {browserData?.operatingSystem && (
                                <div>OS: {browserData.operatingSystem}</div>
                              )}
                              {browserData?.deviceType && (
                                <div>Device: {browserData.deviceType}</div>
                              )}
                              {browserData?.screenResolution && (
                                <div>Screen: {browserData.screenResolution}</div>
                              )}
                              {(location?.city || location?.country) && (
                                <div className="flex items-center gap-1 pt-1 border-t border-border/50">
                                  <MapPin className="h-3 w-3" />
                                  {[location.city, location.region, location.country].filter(Boolean).join(', ')}
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })()}
                  </TableCell>

                  {/* Date */}
                  <TableCell className="hidden sm:table-cell">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm text-muted-foreground cursor-default">
                          {formatDistanceToNow(new Date(relevantDate), { addSuffix: true })}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <div className="space-y-1">
                          {participation.invited_at && (
                            <div>Invited: {format(new Date(participation.invited_at), 'MMM d, yyyy HH:mm')}</div>
                          )}
                          {participation.started_at && (
                            <div>Started: {format(new Date(participation.started_at), 'MMM d, yyyy HH:mm')}</div>
                          )}
                          {participation.completed_at && (
                            <div>Completed: {format(new Date(participation.completed_at), 'MMM d, yyyy HH:mm')}</div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>

                  {/* Duration */}
                  <TableCell className="hidden lg:table-cell text-right">
                    {completionTime ? (
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {completionTime}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    {participation.status === 'completed' && participation.participant_id && participation.study.project_id && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/projects/${participation.study.project_id}/studies/${participation.study_id}/results?participant=${participation.participant_id}`}>
                          Results
                          <ExternalLink className="h-3.5 w-3.5 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
})

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}
