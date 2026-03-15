'use client'

import { memo, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { CalendarClock, AlertCircle } from 'lucide-react'
import { useLocalInputSync } from '@/hooks/use-local-input-sync'
import type { ClosingRuleType } from '../../types'
import {
  MAX_PARTICIPANTS_LIMIT,
  MAX_PARTICIPANTS_DEFAULT,
  MAX_CLOSE_DATE_DAYS,
  INACTIVE_NO_RESPONSE_DAYS,
  INACTIVE_NOT_VIEWED_DAYS,
  RECORDING_RETENTION_DAYS,
  getMaxCloseDate,
  getDefaultCloseDate,
  clampParticipantCount,
} from '@/lib/retention-policy'

// Re-export for backwards compatibility
export { MAX_PARTICIPANTS_LIMIT, MAX_PARTICIPANTS_DEFAULT, MAX_CLOSE_DATE_DAYS, getMaxCloseDate, getDefaultCloseDate }

/** Format date for input[type="date"] */
function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0]
}

/** Get today's date formatted for min attribute */
function getTodayForInput(): string {
  return formatDateForInput(new Date())
}

export interface ClosingRuleCardProps {
  closingRule: {
    type: ClosingRuleType
    closeDate?: string
    maxParticipants?: number
  }
  onTypeChange: (type: ClosingRuleType) => void
  onDateChange: (date: string | undefined) => void
  onMaxParticipantsChange: (max: number | undefined) => void
  isReadOnly: boolean
}

/** Both close date and participant limit are mandatory to prevent abandoned studies. */
export const ClosingRuleCard = memo(function ClosingRuleCard({
  closingRule,
  onTypeChange,
  onDateChange,
  onMaxParticipantsChange,
  isReadOnly,
}: ClosingRuleCardProps) {
  // Ensure type is always 'both' (mandatory)
  // This migrates legacy studies with 'none', 'date', or 'participant_count'
  useEffect(() => {
    if (closingRule.type !== 'both' && !isReadOnly) {
      onTypeChange('both')
    }
  }, [closingRule.type, isReadOnly, onTypeChange])

  const {
    value: localMaxParticipants,
    setValue: setLocalMaxParticipants,
    handleBlur: handleMaxBlur,
  } = useLocalInputSync(closingRule.maxParticipants?.toString() || MAX_PARTICIPANTS_DEFAULT.toString(), {
    onSync: (value: string) => {
      const parsed = parseInt(value, 10)
      onMaxParticipantsChange(clampParticipantCount(parsed))
    },
  })

  // Calculate max date constraint
  const maxDateStr = useMemo(() => formatDateForInput(getMaxCloseDate()), [])
  const todayStr = useMemo(() => getTodayForInput(), [])

  // Handle date change with validation
  const handleDateChange = (dateStr: string) => {
    if (!dateStr) {
      // If cleared, set to max date (30 days from now)
      onDateChange(getDefaultCloseDate())
      return
    }

    const selectedDate = new Date(dateStr)
    const maxDate = getMaxCloseDate()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Clamp to valid range (today to 30 days from now)
    if (selectedDate < today) {
      onDateChange(new Date().toISOString())
    } else if (selectedDate > maxDate) {
      onDateChange(maxDate.toISOString())
    } else {
      onDateChange(selectedDate.toISOString())
    }
  }

  // Calculate days until close for display
  const daysUntilClose = useMemo(() => {
    if (!closingRule.closeDate) return MAX_CLOSE_DATE_DAYS
    const closeDate = new Date(closingRule.closeDate)
    const today = new Date()
    const diffTime = closeDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }, [closingRule.closeDate])

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-5 w-5" />
          Closing Rules
        </CardTitle>
        <CardDescription>
          Your study will automatically close when either limit is reached.
          This helps manage storage and ensures timely data analysis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Participant Limit */}
        <div className="space-y-2">
          <Label htmlFor="max-participants">Maximum Participants</Label>
          <Input
            id="max-participants"
            type="number"
            min={1}
            max={MAX_PARTICIPANTS_LIMIT}
            value={localMaxParticipants}
            onChange={(e) => setLocalMaxParticipants(e.target.value)}
            onBlur={handleMaxBlur}
            placeholder={`Max ${MAX_PARTICIPANTS_LIMIT}`}
            disabled={isReadOnly}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Study closes after {closingRule.maxParticipants || MAX_PARTICIPANTS_DEFAULT} completed responses (max {MAX_PARTICIPANTS_LIMIT})
          </p>
        </div>

        {/* Close Date */}
        <div className="space-y-2">
          <Label htmlFor="close-date-input">Close Date</Label>
          <Input
            id="close-date-input"
            type="date"
            min={todayStr}
            max={maxDateStr}
            value={closingRule.closeDate?.split('T')[0] || maxDateStr}
            onChange={(e) => handleDateChange(e.target.value)}
            disabled={isReadOnly}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Study closes in {daysUntilClose} day{daysUntilClose !== 1 ? 's' : ''} (max {MAX_CLOSE_DATE_DAYS} days from launch)
          </p>
        </div>

        {/* Info about retention */}
        <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-foreground">Recording Retention</p>
            <p className="mt-1">
              Session recordings are automatically deleted {RECORDING_RETENTION_DAYS} days after a study becomes inactive
              ({INACTIVE_NO_RESPONSE_DAYS} days without responses + {INACTIVE_NOT_VIEWED_DAYS} days without being viewed). Study data and analytics are preserved.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
