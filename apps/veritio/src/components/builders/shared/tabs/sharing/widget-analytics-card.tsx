'use client'

import { memo } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, TrendingUp, MousePointerClick, X, CheckCircle } from 'lucide-react'
import { WidgetFunnelVisualization } from './widget-funnel-visualization'

interface WidgetAnalyticsCardProps {
  studyId: string
}

interface TriggerData {
  triggerType: string
  impressions: number
  clicks: number
  ctr: number
}

interface WidgetAnalyticsData {
  totalImpressions: number
  totalClicks: number
  totalDismissals: number
  totalConversions: number
  clickThroughRate: number
  dismissalRate: number
  conversionRate: number
  byTrigger: TriggerData[]
  timeSeries: Array<{ date: string; impressions: number; clicks: number }>
  sessionInsights: {
    averageTimeOnPageMs: number
    averageTimeVisibleMs: number
    uniqueDevices: number
    returningDevices: number
  }
}

export const WidgetAnalyticsCard = memo(function WidgetAnalyticsCard({
  studyId,
}: WidgetAnalyticsCardProps) {
  // Fetch analytics with SWR (30 second refresh)
  const { data, error, isLoading } = useSWR<WidgetAnalyticsData>(
    `/api/studies/${studyId}/analytics/widget`,
    {
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      revalidateOnFocus: true,
    }
  )

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Widget Performance</CardTitle>
          </div>
          <CardDescription>Loading analytics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse bg-muted/30 rounded-md" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Widget Performance</CardTitle>
          </div>
          <CardDescription>Failed to load analytics</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // No data yet
  if (data.totalImpressions === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Widget Performance</CardTitle>
          </div>
          <CardDescription>Track how visitors interact with your website widget</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No widget impressions yet. Once visitors see your widget, analytics will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Widget Performance</CardTitle>
        </div>
        <CardDescription>Track how visitors interact with your website widget</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={TrendingUp}
            label="Impressions"
            value={data.totalImpressions}
            subtitle="Times shown"
          />
          <StatCard
            icon={MousePointerClick}
            label="Clicks"
            value={data.totalClicks}
            subtitle={`${data.clickThroughRate.toFixed(1)}% CTR`}
            color="text-blue-600"
          />
          <StatCard
            icon={X}
            label="Dismissals"
            value={data.totalDismissals}
            subtitle={`${data.dismissalRate.toFixed(1)}% rate`}
            color="text-amber-600"
          />
          <StatCard
            icon={CheckCircle}
            label="Conversions"
            value={data.totalConversions}
            subtitle={`${data.conversionRate.toFixed(1)}% of clicks`}
            color="text-green-600"
          />
        </div>

        {/* Funnel Visualization */}
        <div>
          <h3 className="text-sm font-medium mb-3">Conversion Funnel</h3>
          <WidgetFunnelVisualization
            impressions={data.totalImpressions}
            clicks={data.totalClicks}
            dismissals={data.totalDismissals}
            conversions={data.totalConversions}
          />
        </div>

        {/* Trigger Breakdown */}
        {data.byTrigger.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3">Performance by Trigger Type</h3>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 font-medium">Trigger</th>
                    <th className="text-right p-2 font-medium">Impressions</th>
                    <th className="text-right p-2 font-medium">Clicks</th>
                    <th className="text-right p-2 font-medium">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byTrigger.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2 capitalize">{item.triggerType.replace(/_/g, ' ')}</td>
                      <td className="p-2 text-right">{item.impressions}</td>
                      <td className="p-2 text-right">{item.clicks}</td>
                      <td className="p-2 text-right font-medium">{item.ctr.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Session Insights */}
        <div>
          <h3 className="text-sm font-medium mb-3">Session Insights</h3>
          <div className="grid grid-cols-2 gap-4">
            <InsightCard
              label="Avg Time on Page"
              value={formatTime(data.sessionInsights.averageTimeOnPageMs)}
              subtitle="Before widget shown"
            />
            <InsightCard
              label="Avg Time Visible"
              value={formatTime(data.sessionInsights.averageTimeVisibleMs)}
              subtitle="Before action taken"
            />
            <InsightCard
              label="Unique Devices"
              value={data.sessionInsights.uniqueDevices}
              subtitle="Total visitors"
            />
            <InsightCard
              label="Returning Devices"
              value={data.sessionInsights.returningDevices}
              subtitle={`${((data.sessionInsights.returningDevices / Math.max(1, data.sessionInsights.uniqueDevices)) * 100).toFixed(0)}% return rate`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color = 'text-muted-foreground',
}: {
  icon: any
  label: string
  value: number
  subtitle: string
  color?: string
}) {
  return (
    <div className="rounded-lg border p-3 space-y-1">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function InsightCard({
  label,
  value,
  subtitle,
}: {
  label: string
  value: number | string
  subtitle: string
}) {
  return (
    <div className="rounded-md bg-muted/30 p-3 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}
