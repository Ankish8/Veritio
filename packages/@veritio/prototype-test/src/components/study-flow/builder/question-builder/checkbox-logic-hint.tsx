'use client'

import { Alert, AlertDescription, AlertTitle } from '@veritio/ui'
import { Info } from 'lucide-react'
export function CheckboxLogicHint() {
  return (
    <Alert className="bg-muted/30">
      <Info className="h-4 w-4" />
      <AlertTitle className="text-sm font-medium">
        Logic Priorities
      </AlertTitle>
      <AlertDescription className="text-sm text-muted-foreground mt-2">
        <p className="mb-2">
          If a participant selects multiple options with different logic, the
          priority order is:
        </p>
        <ol className="space-y-1 ml-0.5 text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium shrink-0">
              1
            </span>
            <span>
              <strong className="text-foreground">Go to study</strong> — highest priority
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium shrink-0">
              2
            </span>
            <span>
              <strong className="text-foreground">Next question</strong> — continue screening
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium shrink-0">
              3
            </span>
            <span>
              <strong className="text-foreground">Reject</strong> — lowest priority
            </span>
          </li>
        </ol>
      </AlertDescription>
    </Alert>
  )
}
