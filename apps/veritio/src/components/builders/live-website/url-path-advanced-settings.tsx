'use client'

import { useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { UrlPathStep } from '@/stores/study-builder/live-website-builder'
import { autoDetectWildcardSegments, extractQueryParams, autoDetectWildcardParams } from '@/lib/utils/pathname-wildcard'

interface UrlPathAdvancedSettingsProps {
  steps: UrlPathStep[]
  onToggleWildcard: (stepId: string, segmentIndex: number) => void
  onToggleWildcardParam: (stepId: string, paramKey: string) => void
}

export function UrlPathAdvancedSettings({
  steps,
  onToggleWildcard,
  onToggleWildcardParam,
}: UrlPathAdvancedSettingsProps) {
  const goalStep = steps.length >= 2 ? steps[steps.length - 1] : null
  const goalIsNav = goalStep?.type === 'navigation'

  const goalDynamicSegments = useMemo(() => {
    if (!goalStep || !goalIsNav) return []
    const qIdx = goalStep.pathname.indexOf('?')
    const pathOnly = qIdx === -1 ? goalStep.pathname : goalStep.pathname.slice(0, qIdx)
    const segs = pathOnly.split('/')
    const segments: { index: number; value: string; prefix: string }[] = []
    for (let i = 1; i < segs.length; i++) {
      if (/^\d{4,}$/.test(segs[i])) {
        const prefix = segs.slice(0, i).join('/') + '/'
        segments.push({ index: i, value: segs[i], prefix })
      }
    }
    return segments
  }, [goalStep, goalIsNav])

  const goalWc = useMemo(() => {
    if (!goalStep || !goalIsNav) return [] as number[]
    return goalStep.wildcardSegments ?? autoDetectWildcardSegments(goalStep.pathname)
  }, [goalStep, goalIsNav])

  const goalQueryParams = useMemo(() => {
    if (!goalStep || !goalIsNav) return []
    return extractQueryParams(goalStep.pathname)
  }, [goalStep, goalIsNav])

  const goalWcParams = useMemo(() => {
    if (!goalStep || !goalIsNav) return [] as string[]
    return goalStep.wildcardParams ?? autoDetectWildcardParams(goalStep.pathname)
  }, [goalStep, goalIsNav])

  return (
    <Collapsible defaultOpen={false}>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group w-full">
        <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
        Advanced settings
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-3">
        {/* Goal URL Matching */}
        {goalIsNav && goalDynamicSegments.length > 0 && (
          <div className="rounded-md border p-4 space-y-3">
            <div>
              <p className="text-sm font-medium">Goal URL matching</p>
              <p className="text-sm text-muted-foreground mt-1">
                The goal URL contains dynamic IDs that change between sessions.
                Check the segments to match any value in those positions.
              </p>
            </div>
            <div className="font-mono text-sm bg-muted/50 rounded px-3 py-2 break-all">
              {goalStep!.pathname}
            </div>
            <div className="space-y-3">
              {goalDynamicSegments.map(({ index, value, prefix }) => {
                const isWildcarded = goalWc.includes(index)
                return (
                  <div key={index} className="flex items-start gap-3">
                    <Checkbox
                      id={`wc-${goalStep!.id}-${index}`}
                      checked={isWildcarded}
                      onCheckedChange={() => onToggleWildcard(goalStep!.id, index)}
                      className="mt-0.5"
                    />
                    <div>
                      <label htmlFor={`wc-${goalStep!.id}-${index}`} className="text-sm cursor-pointer">
                        Wildcard <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{value}</code>
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Any value will match at <span className="font-mono">{prefix}</span>
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Query Parameter Matching */}
        {goalIsNav && goalQueryParams.length > 0 && (
          <div className="rounded-md border p-4 space-y-3">
            <div>
              <p className="text-sm font-medium">Query parameter matching</p>
              <p className="text-sm text-muted-foreground mt-1">
                Checked params accept any value. Uncheck to require an exact match.
              </p>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {goalQueryParams.map(({ key, value }) => {
                const isWildcarded = goalWcParams.includes(key)
                return (
                  <div key={key} className="flex items-center gap-2 py-1">
                    <Checkbox
                      id={`wcp-${goalStep!.id}-${key}`}
                      checked={isWildcarded}
                      onCheckedChange={() => onToggleWildcardParam(goalStep!.id, key)}
                    />
                    <label htmlFor={`wcp-${goalStep!.id}-${key}`} className="flex items-center gap-1.5 text-sm cursor-pointer min-w-0">
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono flex-shrink-0">{key}</code>
                      <span className="text-muted-foreground truncate">=&quot;{value}&quot;</span>
                    </label>
                    <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                      {isWildcarded ? 'any value' : 'exact'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
