'use client'

import { AlertTriangle, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { StatisticalTestResult } from './types'

interface CrossTabStatsProps {
  result: StatisticalTestResult
}

interface StatItemProps {
  label: string
  value: string | number
  suffix?: string
  tooltip?: string
}

function StatItem({ label, value, suffix, tooltip }: StatItemProps) {
  const content = (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="font-mono text-lg font-semibold">
        {value}
        {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
      </span>
    </div>
  )

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">{content}</div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}

export function CrossTabStats({ result }: CrossTabStatsProps) {
  if (result.type === 'insufficient_data') {
    return (
      <Alert variant="default" className="bg-muted/50">
        <Info className="h-4 w-4" />
        <AlertTitle>Insufficient Data</AlertTitle>
        <AlertDescription>{result.message}</AlertDescription>
      </Alert>
    )
  }

  if (result.type === 'fisher_exact') {
    const { pValue, isSignificant, oddsRatio } = result.result

    return (
      <div className="space-y-3">
        <div className="border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="px-4 py-2.5 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Fisher&apos;s Exact Test</span>
              <span className="text-xs text-muted-foreground">
                {isSignificant ? 'Statistically significant' : 'Not significant'}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="p-4 grid grid-cols-2 gap-6">
            <StatItem
              label="p-value"
              value={pValue < 0.001 ? '< 0.001' : pValue.toFixed(4)}
              tooltip="Probability that the observed relationship is due to chance. Values below 0.05 indicate statistical significance."
            />
            <StatItem
              label="Odds Ratio"
              value={oddsRatio === Infinity ? '∞' : oddsRatio.toFixed(2)}
              tooltip="Measures the strength of association between two events. Values > 1 indicate positive association, < 1 indicate negative association."
            />
          </div>
        </div>

        {/* Interpretation */}
        <p className="text-xs text-muted-foreground">
          {isSignificant ? (
            <>There is a statistically significant relationship between these two questions (p &lt; 0.05).</>
          ) : (
            <>No statistically significant relationship was found. The observed differences could be due to random chance.</>
          )}
        </p>
      </div>
    )
  }

  if (result.type === 'chi_square') {
    const {
      chiSquare,
      degreesOfFreedom,
      pValue,
      isSignificant,
      cramersV,
      effectInterpretation,
      hasLowExpectedCounts,
      lowExpectedCountWarning,
    } = result.result

    return (
      <div className="space-y-3">
        <div className="border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="px-4 py-2.5 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Chi-Square Test</span>
              <span className="text-xs text-muted-foreground">
                {isSignificant ? 'Statistically significant' : 'Not significant'}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-6">
            <StatItem
              label="Chi-Square (χ²)"
              value={chiSquare.toFixed(2)}
              tooltip="Test statistic measuring how much the observed frequencies differ from expected frequencies under independence."
            />
            <StatItem
              label="Degrees of Freedom"
              value={degreesOfFreedom}
              tooltip="(rows - 1) × (columns - 1). Determines the shape of the chi-square distribution for significance testing."
            />
            <StatItem
              label="p-value"
              value={pValue < 0.001 ? '< 0.001' : pValue.toFixed(4)}
              tooltip="Probability that the observed relationship is due to chance. Values below 0.05 indicate statistical significance."
            />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Effect Size
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <span className="font-mono text-lg font-semibold">
                        {cramersV.toFixed(3)}
                      </span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({effectInterpretation})
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">
                      Cramer&apos;s V measures the strength of association (0 = no association, 1 = perfect association).
                      Interpretation: negligible (&lt;0.1), small (0.1-0.2), medium (0.2-0.4), large (&gt;0.4).
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Warning for low expected counts */}
        {hasLowExpectedCounts && lowExpectedCountWarning && (
          <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
              {lowExpectedCountWarning}
            </AlertDescription>
          </Alert>
        )}

        {/* Interpretation */}
        <p className="text-sm text-muted-foreground">
          {isSignificant ? (
            <>
              There is a statistically significant relationship between these questions (p &lt; 0.05).
              The {effectInterpretation} effect size suggests the relationship is {effectInterpretation === 'large' ? 'practically meaningful' : effectInterpretation === 'medium' ? 'moderately meaningful' : 'relatively small in practical terms'}.
            </>
          ) : (
            <>
              No statistically significant relationship was found between these questions.
              The observed differences could be due to random chance.
            </>
          )}
        </p>
      </div>
    )
  }

  return null
}
