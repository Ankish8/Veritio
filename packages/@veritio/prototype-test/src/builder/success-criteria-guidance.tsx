'use client'

import { memo } from 'react'
import { Flag, Route, HelpCircle } from 'lucide-react'
import {
  cn,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@veritio/ui'

interface SuccessCriteriaGuidanceProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CriteriaExplanation {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  whenToUse: string[]
  example: string
  iconColor: string
  bgColor: string
}

const criteriaExplanations: CriteriaExplanation[] = [
  {
    id: 'destination',
    icon: Flag,
    title: 'Reach a Screen',
    description: 'Task succeeds when the participant navigates to any of the goal screens, regardless of the path taken. Optionally require specific component states (tabs, toggles) on the destination screen.',
    whenToUse: [
      'Multi-screen prototypes with navigation',
      'When the journey matters less than the destination',
      'Testing if users can find a specific feature',
      'Single-screen prototypes where success is reaching a specific tab or toggle state',
    ],
    example: '"Find the Settings page" - Success when they reach Settings. Or: "Switch to Monthly pricing" - Success when they reach Settings AND the Monthly tab is active.',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/50',
  },
  {
    id: 'pathway',
    icon: Route,
    title: 'Follow a Path',
    description: 'Task succeeds when the participant follows the exact sequence of screens you define. Track component state changes along the way.',
    whenToUse: [
      'Testing specific user flows (checkout, onboarding)',
      'When the journey matters as much as the destination',
      'Validating multi-step processes',
    ],
    example: '"Complete checkout" - Success only if they go Home → Cart → Payment → Confirmation.',
    iconColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/50',
  },
]
export const SuccessCriteriaGuidance = memo(function SuccessCriteriaGuidance({
  open,
  onOpenChange,
}: SuccessCriteriaGuidanceProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
            Choosing Success Criteria
          </DialogTitle>
          <DialogDescription>
            Select the criteria type that best matches how you want to measure task success.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {criteriaExplanations.map((criteria) => {
            const Icon = criteria.icon
            return (
              <div
                key={criteria.id}
                className="rounded-lg border p-4 space-y-3"
              >
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', criteria.bgColor)}>
                    <Icon className={cn('w-5 h-5', criteria.iconColor)} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{criteria.title}</h3>
                    <p className="text-sm text-muted-foreground">{criteria.description}</p>
                  </div>
                </div>

                {/* When to use */}
                <div className="pl-[52px]">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    When to use
                  </p>
                  <ul className="space-y-1">
                    {criteria.whenToUse.map((item, index) => (
                      <li key={index} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-muted-foreground mt-1.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Example */}
                <div className="pl-[52px]">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Example
                  </p>
                  <p className="text-sm text-foreground italic bg-muted/50 rounded px-2 py-1.5">
                    {criteria.example}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick comparison */}
        <div className="border-t pt-4 mt-2">
          <p className="text-sm font-medium mb-3">Quick Comparison</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded bg-emerald-50 dark:bg-emerald-950/30 text-center">
              <Flag className="w-4 h-4 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
              <p className="font-medium">Reach a Screen</p>
              <p className="text-muted-foreground">Any route to goal</p>
              <p className="text-muted-foreground text-[12px] mt-1">+ optional component states</p>
            </div>
            <div className="p-3 rounded bg-blue-50 dark:bg-blue-950/30 text-center">
              <Route className="w-4 h-4 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
              <p className="font-medium">Follow a Path</p>
              <p className="text-muted-foreground">Exact route required</p>
              <p className="text-muted-foreground text-[12px] mt-1">+ state tracking along the way</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
})

export default SuccessCriteriaGuidance
