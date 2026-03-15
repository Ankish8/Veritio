'use client'

import { memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, ShieldOff, ShieldCheck, ShieldAlert } from 'lucide-react'
import type { ResponsePreventionLevel } from '../../types'

export interface ResponsePreventionCardProps {
  level: ResponsePreventionLevel
  onLevelChange: (level: ResponsePreventionLevel) => void
  isReadOnly: boolean
}

const LEVEL_DESCRIPTIONS: Record<ResponsePreventionLevel, string> = {
  none: 'No duplicate prevention. Anyone can take the study multiple times.',
  relaxed: 'Cookie-based tracking. Easy to bypass with incognito mode.',
  moderate: 'Cookie + IP tracking. Requires VPN + incognito to bypass.',
  strict: 'Browser fingerprinting. Difficult to bypass without a different device.',
}

export const ResponsePreventionCard = memo(function ResponsePreventionCard({
  level,
  onLevelChange,
  isReadOnly,
}: ResponsePreventionCardProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-5 w-5" />
          Response Prevention
        </CardTitle>
        <CardDescription>Prevent participants from taking the study multiple times.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prevention-level">Prevention Level</Label>
          <Select
            value={level}
            onValueChange={(value) => onLevelChange(value as ResponsePreventionLevel)}
            disabled={isReadOnly}
          >
            <SelectTrigger id="prevention-level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <div className="flex items-center gap-2">
                  <ShieldOff className="h-4 w-4 text-muted-foreground" />
                  <span>None</span>
                </div>
              </SelectItem>
              <SelectItem value="relaxed">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span>Relaxed</span>
                </div>
              </SelectItem>
              <SelectItem value="moderate">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-500" />
                  <span>Moderate</span>
                </div>
              </SelectItem>
              <SelectItem value="strict">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                  <span>Strict</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{LEVEL_DESCRIPTIONS[level]}</p>
        </div>
      </CardContent>
    </Card>
  )
})
