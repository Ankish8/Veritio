'use client'

import { ChevronRight } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { shortenUrl, normalizeUrlForComparison } from './paths-utils'

interface UrlBreadcrumbProps {
  urls: string[]
  targetUrl?: string | null
}

/**
 * Renders a URL sequence as pills with chevron separators.
 * Goal URL (matching targetUrl) highlighted in green.
 */
export function UrlBreadcrumb({ urls, targetUrl }: UrlBreadcrumbProps) {
  const normalizedTarget = targetUrl ? normalizeUrlForComparison(targetUrl) : null

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {urls.map((url, idx) => {
        const isGoal = normalizedTarget
          ? normalizeUrlForComparison(url) === normalizedTarget
          : false

        return (
          <span key={idx} className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'font-mono px-2 py-0.5 rounded text-xs max-w-[180px] truncate inline-block',
                    isGoal
                      ? 'bg-muted text-green-700 dark:text-green-400 font-medium'
                      : 'bg-muted'
                  )}
                >
                  {shortenUrl(url)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-md break-all">
                <p className="text-xs font-mono">{url}</p>
              </TooltipContent>
            </Tooltip>
            {idx < urls.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </span>
        )
      })}
    </div>
  )
}
