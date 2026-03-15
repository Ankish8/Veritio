'use client'

import { memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link2, QrCode, Mail, Smartphone, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RecruitmentSummaryCardProps {
  participantUrl: string
  widgetEnabled: boolean
  onTabChange: (tab: 'distribution' | 'widget') => void
}

export const RecruitmentSummaryCard = memo(function RecruitmentSummaryCard({
  participantUrl,
  widgetEnabled,
  onTabChange,
}: RecruitmentSummaryCardProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(participantUrl)
    } catch {
      // Clipboard API may fail
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recruitment Methods</CardTitle>
        <CardDescription>
          Choose how you want to recruit participants for this study.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Study Link - Quick Copy */}
        <div className="p-4 rounded-lg border bg-muted/30">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-sm">Study Link</span>
              </div>
              <code className="block px-2 py-1.5 bg-background rounded text-xs font-mono truncate">
                {participantUrl}
              </code>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="shrink-0"
            >
              Copy
            </Button>
          </div>
        </div>

        {/* Recruitment Methods Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => onTabChange('distribution')}
            className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left"
          >
            <div className="p-2 rounded-md bg-purple-100">
              <QrCode className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm mb-1">QR Code</div>
              <div className="text-xs text-muted-foreground">
                Download QR code for print materials
              </div>
            </div>
          </button>

          <button
            onClick={() => onTabChange('distribution')}
            className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left"
          >
            <div className="p-2 rounded-md bg-blue-100">
              <Mail className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm mb-1">Email Template</div>
              <div className="text-xs text-muted-foreground">
                Copy template for email invitations
              </div>
            </div>
          </button>

          <button
            onClick={() => onTabChange('widget')}
            className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left"
          >
            <div className={cn(
              "p-2 rounded-md",
              widgetEnabled ? "bg-green-100" : "bg-gray-100"
            )}>
              <Smartphone className={cn(
                "h-4 w-4",
                widgetEnabled ? "text-green-600" : "text-gray-600"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">Website Widget</span>
                {widgetEnabled ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    Active
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Inactive</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {widgetEnabled ? 'Recruiting from your website' : 'Set up widget embed code'}
              </div>
            </div>
          </button>

          <a
            href={participantUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left"
          >
            <div className="p-2 rounded-md bg-indigo-100">
              <ExternalLink className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm mb-1">Preview Study</div>
              <div className="text-xs text-muted-foreground">
                See what participants will experience
              </div>
            </div>
          </a>
        </div>
      </CardContent>
    </Card>
  )
})
