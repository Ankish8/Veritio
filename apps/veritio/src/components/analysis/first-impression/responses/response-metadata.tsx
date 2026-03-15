'use client'

/**
 * Response Metadata Component
 *
 * Displays participant metadata in a tooltip/popover format.
 * Shows device, viewport, time, and design info.
 */

import { useMemo } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Info, Monitor, Smartphone, Tablet, Clock, Image } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import type {
  FirstImpressionSession,
  FirstImpressionExposure,
} from '@/services/results/first-impression'

interface ResponseMetadataProps {
  session: FirstImpressionSession | undefined
  exposure: FirstImpressionExposure | undefined
  designName: string
  submittedAt: string | null
  responseTimeMs: number | null
}

export function ResponseMetadata({
  session,
  exposure,
  designName,
  submittedAt,
  responseTimeMs,
}: ResponseMetadataProps) {
  // Device icon based on type
  const DeviceIcon = useMemo(() => {
    switch (session?.device_type) {
      case 'mobile':
        return Smartphone
      case 'tablet':
        return Tablet
      default:
        return Monitor
    }
  }, [session?.device_type])

  // Format submission time
  const timeDisplay = useMemo((): { relative: string; absolute: string } | null => {
    if (!submittedAt) return null
    const date = new Date(submittedAt)
    return {
      relative: formatDistanceToNow(date, { addSuffix: true }),
      absolute: format(date, 'MMM d, yyyy h:mm a'),
    }
  }, [submittedAt])

  // Format response time
  const responseTime = useMemo(() => {
    if (!responseTimeMs) return null
    if (responseTimeMs < 1000) return `${responseTimeMs}ms`
    return `${(responseTimeMs / 1000).toFixed(1)}s`
  }, [responseTimeMs])

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="w-64 p-3">
          <div className="space-y-2 text-sm">
            {/* Design */}
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Design:</span>
              <span className="font-medium">{designName}</span>
            </div>

            {/* Device */}
            <div className="flex items-center gap-2">
              <DeviceIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Device:</span>
              <span className="font-medium capitalize">
                {session?.device_type || 'Unknown'}
              </span>
              {session?.viewport_width && session?.viewport_height && (
                <span className="text-muted-foreground text-xs">
                  ({session.viewport_width}×{session.viewport_height})
                </span>
              )}
            </div>

            {/* Exposure Duration */}
            {exposure?.actual_display_ms && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Exposure:</span>
                <span className="font-medium">
                  {(exposure.actual_display_ms / 1000).toFixed(1)}s
                </span>
              </div>
            )}

            {/* Response Time */}
            {responseTime && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Response time:</span>
                <span className="font-medium">{responseTime}</span>
              </div>
            )}

            {/* Submitted */}
            {timeDisplay ? (
              <>
                <div className="flex items-center gap-2 pt-1 border-t">
                  <span className="text-muted-foreground">Submitted:</span>
                  <span className="font-medium">{timeDisplay.relative}</span>
                </div>
                <div className="text-xs text-muted-foreground pl-0">
                  {timeDisplay.absolute}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 pt-1 border-t">
                <span className="text-muted-foreground">Submitted:</span>
                <span className="font-medium">Unknown</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
