'use client'

import { Calendar, Clock, FileText, Rocket, Users, Target, CalendarClock, Play, Pause, RotateCcw } from 'lucide-react'
import { ScrollArea, Progress, Button, cn } from '@veritio/ui'
import type { StudyInfoPanelProps, StudyStatus } from './study-info-panel-types'
import { formatDate, formatStudyType, getStatusConfig, getStatusIcon } from './study-info-panel-utils'
import { TestSettingsSection } from './test-settings-section'

// Re-export types for consumers
export type {
  StudyInfoPanelProps,
  StudyStatus,
  FirstImpressionDisplaySettings,
  CardSortDisplaySettings,
  TreeTestDisplaySettings,
  FirstClickDisplaySettings,
  PrototypeTestDisplaySettings,
  SurveyDisplaySettings,
  TestDisplaySettings,
} from './study-info-panel-types'

export function StudyInfoPanel({
  studyType,
  status,
  createdAt,
  updatedAt,
  launchedAt,
  studyMode,
  description,
  participantCount = 0,
  closingRule,
  firstImpressionSettings,
  testSettings,
  onStatusChange,
  isChangingStatus,
  context = 'results',
}: StudyInfoPanelProps) {
  const statusConfig = getStatusConfig(status)
  const showResponseStats = status !== 'draft'

  const getStatusAction = () => {
    switch (status) {
      case 'active':
        return { newStatus: 'paused' as StudyStatus, label: 'Pause Study', icon: Pause }
      case 'paused':
        return { newStatus: 'active' as StudyStatus, label: 'Resume Study', icon: Play }
      case 'completed':
        return { newStatus: 'active' as StudyStatus, label: 'Reopen Study', icon: RotateCcw }
      default:
        return null
    }
  }
  const statusAction = getStatusAction()

  const showTestSettings = context === 'results' && (testSettings || (studyType === 'first_impression' && firstImpressionSettings))

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-5">
        {/* Status - Prominent at top with action button */}
        <div className="space-y-2">
          <div
            className={cn(
              'rounded-lg px-4 py-3 flex items-center gap-3',
              statusConfig.bgColor
            )}
          >
            {getStatusIcon(statusConfig.icon, statusConfig.iconColor)}
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-semibold', statusConfig.textColor)}>
                {statusConfig.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {statusConfig.subtitle}
              </p>
            </div>
          </div>
          {/* Status action button - pause/resume/reopen */}
          {onStatusChange && statusAction && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onStatusChange(statusAction.newStatus)}
              disabled={isChangingStatus}
            >
              <statusAction.icon className="h-4 w-4 mr-2" />
              {statusAction.label}
            </Button>
          )}
        </div>

        {/* Dates Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Dates
          </h4>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <Calendar className="size-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm font-medium truncate">
                  {formatDate(createdAt)}
                </p>
              </div>
            </div>
            {/* Last modified - shown in builder context */}
            {context === 'builder' && updatedAt && (
              <div className="flex items-center gap-3">
                <Clock className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Last modified</p>
                  <p className="text-sm font-medium truncate">
                    {formatDate(updatedAt)}
                  </p>
                </div>
              </div>
            )}
            {launchedAt && (
              <div className="flex items-center gap-3">
                <Rocket className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Launched</p>
                  <p className="text-sm font-medium truncate">
                    {formatDate(launchedAt)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Details
          </h4>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <FileText className="size-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Study type</p>
                <p className="text-sm font-medium truncate">
                  {formatStudyType(studyType)}
                  {studyMode && (
                    <span className="text-muted-foreground ml-1">({studyMode})</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Test Settings - shown in results context for all study types */}
        {showTestSettings && (
          <TestSettingsSection
            testSettings={testSettings}
            studyType={studyType}
            firstImpressionSettings={firstImpressionSettings}
          />
        )}

        {/* Description - shown in results context if provided */}
        {context === 'results' && description && (
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Description
            </h4>
            <p className="text-sm text-foreground leading-relaxed">
              {description}
            </p>
          </div>
        )}

        {/* Response Stats - Only for launched studies */}
        {showResponseStats && (
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Responses
            </h4>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <Users className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Total responses</p>
                  <p className="text-sm font-medium">{participantCount}</p>
                </div>
              </div>

              {/* Closing Rule - Participant Goal */}
              {(closingRule?.type === 'participant_count' || closingRule?.type === 'both') &&
                closingRule.maxParticipants && (
                  <div className="flex items-center gap-3">
                    <Target className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Goal progress</p>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={Math.min((participantCount / closingRule.maxParticipants) * 100, 100)}
                          className="h-1.5 flex-1"
                        />
                        <span className="text-sm font-medium tabular-nums">
                          {participantCount}/{closingRule.maxParticipants}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              {/* Closing Rule - Date */}
              {(closingRule?.type === 'date' || closingRule?.type === 'both') &&
                closingRule.closeDate && (
                  <div className="flex items-center gap-3">
                    <CalendarClock className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Auto-close date</p>
                      <p className="text-sm font-medium">
                        {formatDate(closingRule.closeDate)}
                      </p>
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
