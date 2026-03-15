'use client'

import { useState } from 'react'
import { DollarSign, TrendingDown, Database, HardDrive, ChevronDown, ChevronUp } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface CostBreakdownItem {
  category: string
  size_gb: number
  cost_per_month: number
  percentage: number
}

interface CostEstimate {
  database_storage_gb: number
  database_cost_per_month: number
  r2_storage_gb: number
  r2_cost_per_month: number
  total_monthly_cost: number
  cost_breakdown: CostBreakdownItem[]
}

interface CostTrackingDashboardProps {
  currentCosts: CostEstimate
  baselineCosts: CostEstimate | null
  totalSavings: number
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatGB(gb: number): string {
  if (gb < 1) {
    return `${(gb * 1024).toFixed(0)} MB`
  }
  return `${gb.toFixed(2)} GB`
}

export function CostTrackingDashboard({
  currentCosts,
  baselineCosts,
  totalSavings,
}: CostTrackingDashboardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const hasBaseline = baselineCosts !== null
  const savingsPercentage = hasBaseline
    ? ((totalSavings / baselineCosts.total_monthly_cost) * 100).toFixed(1)
    : '0'

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-6">
      <div className="flex items-center justify-between border-t pt-6">
        <h2 className="text-xl font-semibold">Cost Tracking & Operational Impact</h2>
        <CollapsibleTrigger className="flex items-center gap-2 px-4 py-2 hover:bg-muted rounded-md transition-colors">
          <span className="text-sm text-muted-foreground">
            {isOpen ? 'Hide' : 'Show'} details
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">Current Monthly Cost</span>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">
              {formatCurrency(currentCosts.total_monthly_cost)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatGB(currentCosts.database_storage_gb)} Database +{' '}
              {formatGB(currentCosts.r2_storage_gb)} R2
            </div>
          </div>

          {hasBaseline && (
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                    Total Savings
                  </span>
                </div>
                <span className="text-xs font-semibold bg-emerald-600 text-white px-2 py-0.5 rounded">
                  -{savingsPercentage}%
                </span>
              </div>
              <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                {formatCurrency(totalSavings)}
              </div>
              <div className="text-xs text-emerald-700/70 dark:text-emerald-300/70">
                Saved per month vs baseline
              </div>
            </div>
          )}

          {hasBaseline && (
            <div className="bg-card border rounded-lg p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Baseline Cost</span>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">
                {formatCurrency(baselineCosts.total_monthly_cost)}
              </div>
              <div className="text-xs text-muted-foreground">Before optimizations</div>
            </div>
          )}
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Cost Breakdown</h3>
          <div className="space-y-4">
            {currentCosts.cost_breakdown.map((item, index) => (
              <div key={item.category} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {item.category.includes('R2') ? (
                      <HardDrive className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Database className="w-4 h-4 text-blue-600" />
                    )}
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">{formatGB(item.size_gb)}</span>
                    <span className="text-sm font-semibold text-foreground min-w-[70px] text-right">
                      {formatCurrency(item.cost_per_month)}/mo
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-700"
                    style={{
                      width: `${item.percentage}%`,
                      transitionDelay: `${index * 50}ms`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-xs text-blue-900 dark:text-blue-200">
            <strong>Note:</strong> Cost estimates are based on Supabase ($0.125/GB after 8GB free) and
            Cloudflare R2 ($0.015/GB after 10GB free) pricing. Actual costs may vary based on compute,
            bandwidth, and other factors.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
