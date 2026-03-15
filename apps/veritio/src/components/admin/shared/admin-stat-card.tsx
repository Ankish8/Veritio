'use client'

import type { ReactNode } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface AdminStatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  trend?: { value: number; label: string }
}

export function AdminStatCard({ label, value, icon, trend }: AdminStatCardProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">{label}</span>
          <div className="text-muted-foreground">{icon}</div>
        </div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.value >= 0 ? (
              <ArrowUp className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5 text-red-600" />
            )}
            <span
              className={`text-xs font-medium ${
                trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {Math.abs(trend.value)}%
            </span>
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
