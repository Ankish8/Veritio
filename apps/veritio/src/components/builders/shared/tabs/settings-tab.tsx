'use client'

import { memo, useCallback } from 'react'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import { useStudyFlowBuilderStore } from '@/stores/study-flow-builder'
import type { SettingsTabProps, ClosingRuleType, ResponsePreventionLevel } from '../types'
import {
  LanguageSettingsCard,
  PasswordProtectionCard,
  PaginationCard,
  ClosingRuleCard,
  ResponsePreventionCard,
  EmailNotificationsCard,
  SessionRecordingCard,
} from './settings'

function SettingsTabComponent({ studyId: _studyId, studyType, isReadOnly = false, baseUrl: _baseUrl }: SettingsTabProps) {
  const {
    meta,
    setLanguage,
    setPassword,
    setClosingRule,
    updateClosingRule,
    updateResponsePrevention,
    updateNotificationSettings,
    toggleNotificationTrigger,
    toggleMilestone,
    updateSessionRecordingSettings,
  } = useStudyMetaStore()

  const { flowSettings, updatePaginationSettings } = useStudyFlowBuilderStore()

  const paginationMode = flowSettings.pagination?.mode ?? 'one_per_page'

  // Closing rule type change handler
  const handleClosingRuleTypeChange = useCallback(
    (type: ClosingRuleType) => {
      setClosingRule({
        type,
        closeDate: type === 'date' || type === 'both' ? meta.closingRule.closeDate : undefined,
        maxParticipants:
          type === 'participant_count' || type === 'both' ? meta.closingRule.maxParticipants : undefined,
      })
    },
    [meta.closingRule.closeDate, meta.closingRule.maxParticipants, setClosingRule]
  )

  // Pagination mode handler
  const handlePaginationChange = useCallback(
    (mode: 'progressive' | 'one_per_page') => updatePaginationSettings({ mode }),
    [updatePaginationSettings]
  )

  // Response prevention level handler
  const handlePreventionChange = useCallback(
    (level: ResponsePreventionLevel) => updateResponsePrevention({ level }),
    [updateResponsePrevention]
  )

  // Notification handlers
  const handleNotificationsEnabled = useCallback(
    (enabled: boolean) => updateNotificationSettings({ enabled }),
    [updateNotificationSettings]
  )

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Session Recording - hidden for live_website (controlled per-task in Tasks tab) */}
          {studyType !== 'live_website_test' && (
            <div className="border rounded-lg">
              <div className="px-6 py-4 flex items-center gap-2">
                <span className="text-base font-semibold">Session Recording</span>
                <span className="text-sm text-muted-foreground font-normal">
                  (Think-aloud protocols)
                </span>
              </div>
              <div className="px-6 pb-4">
                <SessionRecordingCard
                  settings={meta.sessionRecordingSettings}
                  onSettingsChange={updateSessionRecordingSettings}
                  isReadOnly={isReadOnly}
                  studyType={studyType}
                />
              </div>
            </div>
          )}
          <LanguageSettingsCard
            language={meta.language}
            onLanguageChange={setLanguage}
            isReadOnly={isReadOnly}
          />
          <EmailNotificationsCard
            settings={meta.notificationSettings}
            onEnabledChange={handleNotificationsEnabled}
            onTriggerToggle={toggleNotificationTrigger}
            onMilestoneToggle={toggleMilestone}
            isReadOnly={isReadOnly}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {studyType === 'survey' && (
            <PaginationCard
              paginationMode={paginationMode}
              onModeChange={handlePaginationChange}
              isReadOnly={isReadOnly}
            />
          )}
          <ClosingRuleCard
            closingRule={meta.closingRule}
            onTypeChange={handleClosingRuleTypeChange}
            onDateChange={(date) => updateClosingRule({ closeDate: date })}
            onMaxParticipantsChange={(max) => updateClosingRule({ maxParticipants: max })}
            isReadOnly={isReadOnly}
          />
          <PasswordProtectionCard
            password={meta.password}
            onPasswordChange={setPassword}
            isReadOnly={isReadOnly}
          />
          <ResponsePreventionCard
            level={meta.responsePrevention.level}
            onLevelChange={handlePreventionChange}
            isReadOnly={isReadOnly}
          />
        </div>
      </div>
    </div>
  )
}

export const SettingsTab = memo(
  SettingsTabComponent,
  (prev, next) =>
    prev.studyId === next.studyId &&
    prev.studyType === next.studyType &&
    prev.isReadOnly === next.isReadOnly &&
    prev.baseUrl === next.baseUrl
)
