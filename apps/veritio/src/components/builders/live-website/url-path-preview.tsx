'use client'

import { useMemo } from 'react'
import { ArrowRight, MousePointerClick, Pencil, Shuffle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { UrlSuccessPath, UrlPathStep } from '@/stores/study-builder/live-website-builder'
import { applyWildcards, autoDetectWildcardSegments } from '@/lib/utils/pathname-wildcard'

type PreviewSegment =
  | { type: 'ordered'; step: UrlPathStep; originalIndex: number }
  | { type: 'group'; steps: UrlPathStep[]; groupId: string }

interface UrlPathPreviewProps {
  path: UrlSuccessPath
  onEdit: () => void
  onUpdate?: (path: UrlSuccessPath) => void
}

export function UrlPathPreview({ path, onEdit }: UrlPathPreviewProps) {
  const { steps } = path
  const lastIndex = steps.length - 1

  // Build segments for preview rendering
  const segments = useMemo<PreviewSegment[]>(() => {
    const result: PreviewSegment[] = []
    let i = 0
    while (i < steps.length) {
      if (steps[i].group) {
        const groupId = steps[i].group!
        const groupSteps: UrlPathStep[] = []
        while (i < steps.length && steps[i].group === groupId) {
          groupSteps.push(steps[i])
          i++
        }
        result.push({ type: 'group', steps: groupSteps, groupId })
      } else {
        result.push({ type: 'ordered', step: steps[i], originalIndex: i })
        i++
      }
    }
    return result
  }, [steps])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {segments.map((seg, segIdx) => (
          <div key={seg.type === 'ordered' ? seg.step.id : seg.groupId} className="flex items-center gap-1">
            {segIdx > 0 && (
              <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
            {seg.type === 'ordered' ? (
              seg.step.type === 'click' ? (
                <Badge variant="outline" className="text-xs gap-1 bg-amber-50 text-amber-800 border-amber-200">
                  <MousePointerClick className="h-3 w-3" />
                  {seg.step.elementText || seg.step.label}
                </Badge>
              ) : (
                <Badge
                  variant={seg.originalIndex === 0 ? 'default' : seg.originalIndex === lastIndex ? 'secondary' : 'outline'}
                  className="font-mono text-xs"
                >
                  {seg.originalIndex === lastIndex
                    ? applyWildcards(seg.step.pathname, seg.step.wildcardSegments ?? autoDetectWildcardSegments(seg.step.pathname), seg.step.wildcardParams)
                    : seg.step.pathname}
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="text-xs gap-1 border-primary/30 bg-primary/5 text-primary">
                <Shuffle className="h-3 w-3" />
                {seg.steps.length} steps, any order
              </Badge>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {steps.length} steps
        </span>
        <Button variant="ghost" size="sm" className="h-6 px-2" onClick={onEdit}>
          <Pencil className="h-3 w-3 mr-1" />
          Edit
        </Button>
      </div>
    </div>
  )
}
