'use client'

import { memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Mail } from 'lucide-react'
import { NOTIFICATION_MILESTONES } from '../../types'

export interface NotificationSettings {
  enabled: boolean
  triggers: {
    everyResponse: boolean
    milestones: { enabled: boolean; values: number[] }
    dailyDigest: boolean
    onClose: boolean
  }
}

export interface EmailNotificationsCardProps {
  settings: NotificationSettings
  onEnabledChange: (enabled: boolean) => void
  onTriggerToggle: (trigger: 'everyResponse' | 'milestones' | 'dailyDigest' | 'onClose', enabled: boolean) => void
  onMilestoneToggle: (milestone: number) => void
  isReadOnly: boolean
}

export const EmailNotificationsCard = memo(function EmailNotificationsCard({
  settings,
  onEnabledChange,
  onTriggerToggle,
  onMilestoneToggle,
  isReadOnly,
}: EmailNotificationsCardProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-5 w-5" />
          Email Notifications
        </CardTitle>
        <CardDescription>Get notified about study activity via email.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Master Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="notifications-enabled" className="cursor-pointer">
            Enable Notifications
          </Label>
          <Switch
            id="notifications-enabled"
            checked={settings.enabled}
            onCheckedChange={onEnabledChange}
            disabled={isReadOnly}
          />
        </div>

        {settings.enabled && (
          <>
            <Separator />

            {/* Every Response */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="trigger-every-response" className="cursor-pointer">
                  Every Response
                </Label>
                <p className="text-xs text-muted-foreground">Email on each submission (max 10/hour)</p>
              </div>
              <Switch
                id="trigger-every-response"
                checked={settings.triggers.everyResponse}
                onCheckedChange={(checked) => onTriggerToggle('everyResponse', checked)}
                disabled={isReadOnly}
              />
            </div>

            {/* Milestones */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="trigger-milestones" className="cursor-pointer">
                    Milestones
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified when you reach response milestones
                  </p>
                </div>
                <Switch
                  id="trigger-milestones"
                  checked={settings.triggers.milestones.enabled}
                  onCheckedChange={(checked) => onTriggerToggle('milestones', checked)}
                  disabled={isReadOnly}
                />
              </div>
              {settings.triggers.milestones.enabled && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {NOTIFICATION_MILESTONES.map((milestone) => {
                    const isSelected = settings.triggers.milestones.values.includes(milestone)
                    return (
                      <button
                        key={milestone}
                        type="button"
                        onClick={() => !isReadOnly && onMilestoneToggle(milestone)}
                        disabled={isReadOnly}
                        className={`
                          px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all
                          ${isSelected
                            ? 'bg-primary/10 text-primary border-primary'
                            : 'bg-transparent text-foreground border-border hover:border-primary/60 hover:bg-primary/5'
                          }
                          ${isReadOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                        `}
                      >
                        {milestone.toLocaleString()}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Daily Digest */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="trigger-daily-digest" className="cursor-pointer">
                  Daily Digest
                </Label>
                <p className="text-xs text-muted-foreground">Summary email at 9 AM daily</p>
              </div>
              <Switch
                id="trigger-daily-digest"
                checked={settings.triggers.dailyDigest}
                onCheckedChange={(checked) => onTriggerToggle('dailyDigest', checked)}
                disabled={isReadOnly}
              />
            </div>

            {/* Study Closes */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="trigger-on-close" className="cursor-pointer">
                  Study Closes
                </Label>
                <p className="text-xs text-muted-foreground">When study is closed or reaches limits</p>
              </div>
              <Switch
                id="trigger-on-close"
                checked={settings.triggers.onClose}
                onCheckedChange={(checked) => onTriggerToggle('onClose', checked)}
                disabled={isReadOnly}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
})
