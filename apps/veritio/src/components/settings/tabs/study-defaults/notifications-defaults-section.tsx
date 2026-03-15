'use client'

import { useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Bell } from 'lucide-react'
import type {
  StudyDefaultsNotifications,
  DeepPartial,
  StudyDefaults,
} from '@/lib/supabase/user-preferences-types'

const NOTIFICATION_MILESTONES = [10, 50, 100, 500, 1000]

interface NotificationsDefaultsSectionProps {
  notifications: StudyDefaultsNotifications
  onUpdate: (updates: DeepPartial<StudyDefaults>) => void
}

export function NotificationsDefaultsSection({
  notifications,
  onUpdate,
}: NotificationsDefaultsSectionProps) {
  const handleMilestoneToggle = useCallback(
    (milestone: number) => {
      const currentValues = notifications.milestoneValues || NOTIFICATION_MILESTONES
      const newValues = currentValues.includes(milestone)
        ? currentValues.filter((m) => m !== milestone)
        : [...currentValues, milestone].sort((a, b) => a - b)

      onUpdate({
        notifications: { milestoneValues: newValues },
      })
    },
    [onUpdate, notifications.milestoneValues]
  )

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Default Notifications
        </CardTitle>
        <CardDescription>Email notification settings for new studies</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base font-medium">Enable email notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive email updates about study activity
            </p>
          </div>
          <Switch
            checked={notifications.enabled ?? false}
            onCheckedChange={(checked) => onUpdate({ notifications: { enabled: checked } })}
          />
        </div>

        {notifications.enabled && (
          <>
            <Separator />

            {/* Notification Triggers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Every response</Label>
                  <p className="text-xs text-muted-foreground">Rate limited to 10/hour</p>
                </div>
                <Switch
                  checked={notifications.everyResponse ?? false}
                  onCheckedChange={(checked) =>
                    onUpdate({ notifications: { everyResponse: checked } })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Daily digest</Label>
                  <p className="text-xs text-muted-foreground">Summary at 9 AM</p>
                </div>
                <Switch
                  checked={notifications.dailyDigest ?? false}
                  onCheckedChange={(checked) =>
                    onUpdate({ notifications: { dailyDigest: checked } })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">On study close</Label>
                  <p className="text-xs text-muted-foreground">When study completes</p>
                </div>
                <Switch
                  checked={notifications.onClose ?? true}
                  onCheckedChange={(checked) => onUpdate({ notifications: { onClose: checked } })}
                />
              </div>

              <Separator />

              {/* Milestones */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Response milestones</Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified when you reach these response counts
                    </p>
                  </div>
                  <Switch
                    checked={notifications.milestones ?? true}
                    onCheckedChange={(checked) =>
                      onUpdate({ notifications: { milestones: checked } })
                    }
                  />
                </div>

                {notifications.milestones && (
                  <div className="flex flex-wrap gap-2 pl-0">
                    {NOTIFICATION_MILESTONES.map((milestone) => {
                      const isSelected = notifications.milestoneValues?.includes(milestone)
                      return (
                        <Badge
                          key={milestone}
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => handleMilestoneToggle(milestone)}
                        >
                          {milestone}
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
