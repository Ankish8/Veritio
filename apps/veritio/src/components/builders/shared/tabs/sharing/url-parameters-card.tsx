'use client'

import { memo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Link2, ExternalLink, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { RedirectSettings } from '../../types'
import { useLocalInputSync } from '@/hooks/use-local-input-sync'

interface UrlParametersCardProps {
  redirectSettings?: RedirectSettings
  onRedirectSettingsChange: (updates: Partial<RedirectSettings>) => void
  isDraft: boolean
  isReadOnly?: boolean
}

export const UrlParametersCard = memo(function UrlParametersCard({
  redirectSettings,
  onRedirectSettingsChange,
  isDraft: _isDraft,  
  isReadOnly = false,
}: UrlParametersCardProps) {
  const delay = redirectSettings?.redirectDelay ?? 5

  // Use local input sync for URL fields to prevent typing lag
  const completionUrl = useLocalInputSync(redirectSettings?.completionUrl ?? '', {
    debounceMs: 500,
    onSync: (value) => onRedirectSettingsChange({ completionUrl: value || undefined }),
  })

  const screenoutUrl = useLocalInputSync(redirectSettings?.screenoutUrl ?? '', {
    debounceMs: 500,
    onSync: (value) => onRedirectSettingsChange({ screenoutUrl: value || undefined }),
  })

  const quotaFullUrl = useLocalInputSync(redirectSettings?.quotaFullUrl ?? '', {
    debounceMs: 500,
    onSync: (value) => onRedirectSettingsChange({ quotaFullUrl: value || undefined }),
  })

  const handleDelayChange = useCallback(
    (value: number[]) => {
      onRedirectSettingsChange({ redirectDelay: value[0] })
    },
    [onRedirectSettingsChange]
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Redirect URLs</CardTitle>
        </div>
        <CardDescription>
          Configure redirect URLs for panel integration (Prolific, MTurk, etc.).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="completion-url">Completion URL</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Participants are redirected here after successfully completing the study.
                      Use your panel provider&apos;s completion URL.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="completion-url"
              type="url"
              value={completionUrl.value}
              onChange={(e) => completionUrl.setValue(e.target.value)}
              onBlur={completionUrl.handleBlur}
              disabled={isReadOnly}
              placeholder="https://app.prolific.co/submissions/complete?cc=..."
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="screenout-url">Screenout URL</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Participants are redirected here if they fail screening questions or don&apos;t
                      qualify for the study.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="screenout-url"
              type="url"
              value={screenoutUrl.value}
              onChange={(e) => screenoutUrl.setValue(e.target.value)}
              onBlur={screenoutUrl.handleBlur}
              disabled={isReadOnly}
              placeholder="https://app.prolific.co/submissions/complete?cc=..."
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="quota-full-url">Quota Full URL</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Participants are redirected here if the study has reached its response limit
                      or is closed.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="quota-full-url"
              type="url"
              value={quotaFullUrl.value}
              onChange={(e) => quotaFullUrl.setValue(e.target.value)}
              onBlur={quotaFullUrl.handleBlur}
              disabled={isReadOnly}
              placeholder="https://app.prolific.co/submissions/complete?cc=..."
            />
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label>Redirect Delay</Label>
            <span className="text-sm text-muted-foreground">{delay} seconds</span>
          </div>
          <Slider
            value={[delay]}
            onValueChange={handleDelayChange}
            min={1}
            max={10}
            step={1}
            disabled={isReadOnly}
          />
          <p className="text-xs text-muted-foreground">
            Time shown on thank you page before auto-redirect.
          </p>
        </div>

        <div className="rounded-md bg-muted/50 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">UTM Tracking</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Add UTM parameters to your study link to track traffic sources:
          </p>
          <code className="block text-xs bg-background p-2 rounded border overflow-x-auto">
            ?utm_source=prolific&utm_medium=panel&utm_campaign=q1_study
          </code>
        </div>
      </CardContent>
    </Card>
  )
})
