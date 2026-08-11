'use client'

import {
  Calendar,
  Clock,
  FileText,
  Rocket,
  Users,
  Target,
  CalendarClock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Timer,
  History,
  Infinity as InfinityIcon,
  Globe,
  Lock,
  Video,
} from 'lucide-react'
import { ScrollArea, Progress, Button, cn } from '@veritio/ui'
import type { StudyInfoPanelProps, StudyStatus } from './study-info-panel-types'
import {
  formatDate,
  formatDateTime,
  formatDurationSeconds,
  formatLanguage,
  formatStudyType,
  getStatusConfig,
  getStatusIcon,
} from './study-info-panel-utils'
import { TestSettingsSection } from './test-settings-section'

/** One labelled metric row; the panel is a stack of these. */
function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Users
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {children}
      </div>
    </div>
  )
}

// Re-export types for consumers
export type {
  StudyInfoPanelProps,
  StudyResponseStats,
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
  studyTypeLabel,
  status,
  createdAt,
  updatedAt,
  launchedAt,
  studyMode,
  description,
  participantCount = 0,
  responseStats,
  isLoadingResponseStats = false,
  closingRule,
  language,
  isPasswordProtected,
  isRecordingEnabled,
  firstImpressionSettings,
  testSettings,
  onStatusChange,
  isChangingStatus,
  context = 'results',
}: StudyInfoPanelProps) {
  const statusConfig = getStatusConfig(status)
  const showResponseStats = status !== 'draft'

  // responseStats is authoritative when supplied; participantCount is the
  // fallback for callers that only track a headline number.
  const totalResponses = responseStats?.total ?? participantCount
  // A pending fetch must not render as a real zero — that is indistinguishable
  // from "nobody has responded" and is exactly the bug this panel used to show.
  const pendingStats = isLoadingResponseStats && !responseStats
  const formatCount = (value: number) => (pendingStats ? '—' : value.toLocaleString())

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
            <InfoRow icon={FileText} label="Study type">
              <p className="text-sm font-medium truncate">
                {studyTypeLabel ?? formatStudyType(studyType)}
                {studyMode && (
                  <span className="text-muted-foreground ml-1">({studyMode})</span>
                )}
              </p>
            </InfoRow>

            {language && (
              <InfoRow icon={Globe} label="Language">
                <p className="text-sm font-medium truncate">
                  {formatLanguage(language)}
                </p>
              </InfoRow>
            )}

            {/* Access and recording only appear when switched on — an explicit
                "off" row for every study would be noise. */}
            {isPasswordProtected && (
              <InfoRow icon={Lock} label="Access">
                <p className="text-sm font-medium truncate">Password protected</p>
              </InfoRow>
            )}

            {isRecordingEnabled && (
              <InfoRow icon={Video} label="Session recording">
                <p className="text-sm font-medium truncate">Enabled</p>
              </InfoRow>
            )}
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
              {/* Headline counts read as one glanceable group rather than three
                  identical icon rows. Completed/in-progress need responseStats. */}
              {responseStats || pendingStats ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-border/60 px-2.5 py-2">
                    <p className="text-lg font-semibold tabular-nums leading-tight">
                      {formatCount(totalResponses)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="rounded-lg border border-border/60 px-2.5 py-2">
                    <p className="text-lg font-semibold tabular-nums leading-tight">
                      {formatCount(responseStats?.completed ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div className="rounded-lg border border-border/60 px-2.5 py-2">
                    <p className="text-lg font-semibold tabular-nums leading-tight">
                      {formatCount(responseStats?.inProgress ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">In progress</p>
                  </div>
                </div>
              ) : (
                <InfoRow icon={Users} label="Total responses">
                  <p className="text-sm font-medium tabular-nums">
                    {totalResponses.toLocaleString()}
                  </p>
                </InfoRow>
              )}

              {/* Completion rate is only meaningful once someone has started */}
              {responseStats && responseStats.total > 0 && (
                <InfoRow icon={CheckCircle2} label="Completion rate">
                  <div className="flex items-center gap-2">
                    <Progress
                      value={Math.min(Math.max(responseStats.completionRate, 0), 100)}
                      className="h-1.5 flex-1"
                    />
                    <span className="text-sm font-medium tabular-nums">
                      {responseStats.completionRate}%
                    </span>
                  </div>
                </InfoRow>
              )}

              {responseStats?.averageDurationSeconds !== null &&
                responseStats?.averageDurationSeconds !== undefined && (
                  <InfoRow icon={Timer} label="Average time to complete">
                    <p className="text-sm font-medium tabular-nums">
                      {formatDurationSeconds(responseStats.averageDurationSeconds)}
                    </p>
                  </InfoRow>
                )}

              {responseStats?.lastResponseAt && (
                <InfoRow icon={History} label="Last response">
                  <p className="text-sm font-medium truncate">
                    {formatDateTime(responseStats.lastResponseAt)}
                  </p>
                </InfoRow>
              )}

              {/* Closing Rule - Participant Goal */}
              {(closingRule?.type === 'participant_count' || closingRule?.type === 'both') &&
                closingRule.maxParticipants && (
                  <InfoRow icon={Target} label="Goal progress">
                    <div className="flex items-center gap-2">
                      <Progress
                        value={Math.min((totalResponses / closingRule.maxParticipants) * 100, 100)}
                        className="h-1.5 flex-1"
                      />
                      <span className="text-sm font-medium tabular-nums">
                        {totalResponses}/{closingRule.maxParticipants}
                      </span>
                    </div>
                  </InfoRow>
                )}

              {/* Closing Rule - Date */}
              {(closingRule?.type === 'date' || closingRule?.type === 'both') &&
                closingRule.closeDate && (
                  <InfoRow icon={CalendarClock} label="Auto-close date">
                    <p className="text-sm font-medium">
                      {formatDate(closingRule.closeDate)}
                    </p>
                  </InfoRow>
                )}

              {/* No closing rule is itself worth stating: authors otherwise
                  cannot tell "no auto-close" from "not shown here". */}
              {closingRule && closingRule.type === 'none' && status === 'active' && (
                <InfoRow icon={InfinityIcon} label="Closing">
                  <p className="text-sm font-medium">No auto-close set</p>
                </InfoRow>
              )}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
