'use client'

import { memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Eye, PlayCircle, CheckCircle, Users, ExternalLink } from 'lucide-react'

interface LinkAnalyticsData {
  totalViews: number
  totalStarts: number
  totalCompletions: number
  sourceBreakdown: {
    source: string
    views: number
    starts: number
    completions: number
  }[]
  utmCampaigns: {
    campaign: string
    source: string
    medium: string
    views: number
    completions: number
  }[]
}

interface LinkAnalyticsCardProps {
  studyId: string
  analyticsData?: LinkAnalyticsData
  isLoading?: boolean
}

const SOURCE_LABELS: Record<string, string> = {
  direct: 'Direct Link',
  qr_code: 'QR Code',
  email: 'Email',
  widget: 'Website Widget',
  custom: 'Custom',
}

function calcRate(numerator: number, denominator: number): string {
  return denominator > 0 ? ((numerator / denominator) * 100).toFixed(1) : '0'
}

// Placeholder data for when analytics service isn't ready
const PLACEHOLDER_DATA: LinkAnalyticsData = {
  totalViews: 0,
  totalStarts: 0,
  totalCompletions: 0,
  sourceBreakdown: [],
  utmCampaigns: [],
}

export const LinkAnalyticsCard = memo(function LinkAnalyticsCard({
  studyId: _studyId,  
  analyticsData,
  isLoading = false,
}: LinkAnalyticsCardProps) {
  const data = analyticsData || PLACEHOLDER_DATA

  const viewToStartRate = calcRate(data.totalStarts, data.totalViews)
  const startToCompleteRate = calcRate(data.totalCompletions, data.totalStarts)
  const overallConversionRate = calcRate(data.totalCompletions, data.totalViews)

  const hasData = data.totalViews > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Link Analytics</CardTitle>
        </div>
        <CardDescription>
          Track how participants discover and engage with your study.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : !hasData ? (
          <div className="rounded-md bg-muted/50 p-6 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No link activity yet. Analytics will appear once participants start visiting your
              study.
            </p>
          </div>
        ) : (
          <>
            {/* Funnel Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1 text-center p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center gap-2">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <span className="text-2xl font-bold">{data.totalViews.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">Link Views</p>
              </div>

              <div className="space-y-1 text-center p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center gap-2">
                  <PlayCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-2xl font-bold">{data.totalStarts.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">Started ({viewToStartRate}%)</p>
              </div>

              <div className="space-y-1 text-center p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-2xl font-bold">
                    {data.totalCompletions.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Completed ({startToCompleteRate}%)</p>
              </div>
            </div>

            {/* Conversion Funnel Visual */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall Conversion</span>
                <span className="font-medium">{overallConversionRate}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(parseFloat(overallConversionRate), 100)}%` }}
                />
              </div>
            </div>

            {/* Source Breakdown */}
            {data.sourceBreakdown.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <h4 className="text-sm font-medium">Traffic Sources</h4>
                <div className="space-y-2">
                  {data.sourceBreakdown.map((source) => {
                    const sourceLabel = SOURCE_LABELS[source.source] || source.source
                    const sourceConversion =
                      source.views > 0
                        ? ((source.completions / source.views) * 100).toFixed(0)
                        : '0'

                    return (
                      <div
                        key={source.source}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{sourceLabel}</span>
                        </div>
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <span>{source.views} views</span>
                          <span>{source.completions} completed</span>
                          <span className="font-medium text-foreground">{sourceConversion}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* UTM Campaigns */}
            {data.utmCampaigns.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <h4 className="text-sm font-medium">Campaign Performance</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left font-medium py-2">Campaign</th>
                        <th className="text-left font-medium py-2">Source</th>
                        <th className="text-right font-medium py-2">Views</th>
                        <th className="text-right font-medium py-2">Completed</th>
                        <th className="text-right font-medium py-2">Conv.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.utmCampaigns.map((campaign, idx) => {
                        const convRate =
                          campaign.views > 0
                            ? ((campaign.completions / campaign.views) * 100).toFixed(0)
                            : '0'
                        return (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="py-2">{campaign.campaign || '(none)'}</td>
                            <td className="py-2 text-muted-foreground">
                              {campaign.source || '-'} / {campaign.medium || '-'}
                            </td>
                            <td className="py-2 text-right">{campaign.views}</td>
                            <td className="py-2 text-right">{campaign.completions}</td>
                            <td className="py-2 text-right font-medium">{convRate}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
})
