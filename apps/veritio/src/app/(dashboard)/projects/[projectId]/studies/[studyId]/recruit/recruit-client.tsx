'use client'

/**
 * Recruit Client - Client Component
 *
 * Renders recruitment page for distributing study links.
 * Integrates with Panel for participant CRM and tracking.
 *
 * Features:
 * - Distribution: Links, email, widget, Panel invitations
 * - Right-side settings panel (QR code, redirect URLs, UTM, public results)
 * - Auto-save with status indicator (same as Setup page)
 */

import { memo, useState, useMemo, useCallback, useEffect } from 'react'
import { Eye } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Header } from '@/components/dashboard/header'
import { StudyNavigationHeader } from '@/components/dashboard/study-navigation-header'
import { Button } from '@/components/ui/button'
import { AutoSaveStatus } from '@/components/builders/save-status'

// Real-time collaboration
import { YjsProvider, CollaborativeAvatars, SyncStatusIndicator } from '@/components/yjs'

// Distribution cards
import { ParticipantLinkCard } from '@/components/recruit/participant-link-card'
import { EmailTemplateCard } from '@/components/recruit/email-template-card'
import { WidgetStatusCard } from '@/components/recruit/widget-status-card'

// Store
import { useStudyMetaStore, useMetaIsDirty, selectMetaIsDirty } from '@/stores/study-meta-store'

// Hooks
import { useAuthFetch } from '@/hooks'
import { useAutoSave } from '@/hooks/use-auto-save'
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning'
import { withRetry } from '@/lib/utils/retry'

// Panel hooks
import { useRecruitPanels } from './hooks/use-recruit-panels'
import { useStudyIncentiveConfig } from '@/hooks/panel'

import type { Database } from '@veritio/study-types'
import type { SaveStatus } from '@/components/builders/shared/types'

type Study = Database['public']['Tables']['studies']['Row']
type Project = Database['public']['Tables']['projects']['Row']

interface RecruitClientProps {
  studyId: string
  projectId: string
  study: Study
  project: Pick<Project, 'id' | 'name'>
  studyCode: string
  participantUrl: string
  baseUrl: string
  timeEstimate?: string
  hasEmailEnabled?: boolean
}

export const RecruitClient = memo(function RecruitClient({
  studyId,
  projectId,
  study,
  project,
  studyCode,
  participantUrl,
  baseUrl,
  timeEstimate,
  hasEmailEnabled,
}: RecruitClientProps) {
  const authFetch = useAuthFetch()

  // Use computed dirty selector for meta store
  const isDirty = useMetaIsDirty()

  const {
    setUrlSlug,
    saveStatus: metaSaveStatus,
    lastSavedAt,
    setSaveStatus,
  } = useStudyMetaStore()

  const isDraft = study.status === 'draft'

  // Save function that persists meta to API
  const performSave = useCallback(async () => {
    // Get fresh state at execution time to avoid stale closures
    const storeState = useStudyMetaStore.getState()
    const currentMetaDirty = selectMetaIsDirty(storeState)
    const freshMeta = storeState.meta

    if (!currentMetaDirty) return

    // Capture the exact meta being sent BEFORE the API call
    const sentMeta = JSON.parse(JSON.stringify({ meta: freshMeta }))

    setSaveStatus('saving')

    try {
      const response = await withRetry(() => authFetch(`/api/studies/${studyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url_slug: freshMeta.urlSlug,
          sharing_settings: freshMeta.sharingSettings,
        }),
      }))

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      // Mark saved with the EXACT data that was sent
      useStudyMetaStore.getState().markSavedWithData(sentMeta)
    } catch (error) {
      setSaveStatus('error')
      toast.error('Failed to save changes', {
        description: 'Please try again or check your connection.',
      })
      throw error
    }
  }, [studyId, setSaveStatus, authFetch])

  // Auto-save hook - triggers save when isDirty transitions to true
  const { saveNow, isSaving } = useAutoSave({
    onSave: performSave,
    isDirty,
    delay: 500,
    enabled: !isDraft,
  })

  // Show browser warning when leaving with unsaved changes
  useUnsavedChangesWarning(isDirty)

  // Combined save status
  const saveStatus: SaveStatus = isSaving
    ? 'saving'
    : metaSaveStatus === 'error'
      ? 'error'
      : isDirty
        ? 'idle'
        : 'saved'

  // Keyboard shortcut for manual save (Cmd+S / Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (isDirty && !isSaving) {
          saveNow()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDirty, isSaving, saveNow])

  // Get branding for QR code
  const branding = (study.branding && typeof study.branding === 'object' && !Array.isArray(study.branding)
    ? study.branding
    : {}) as Record<string, any>
  const primaryColor = branding.primaryColor || '#000000'
  const logoUrl = branding.logo?.url

  // Fetch incentive config for email template placeholder
  const { config: incentiveConfig } = useStudyIncentiveConfig(isDraft ? null : studyId)

  // Lifted email template state — shared between EmailTemplateCard and PanelInviteSection
  const isIncentiveEnabled = incentiveConfig?.enabled ?? false
  const [emailSubject, setEmailSubject] = useState('Help us improve - Take a quick survey')
  const [emailBody, setEmailBody] = useState(() =>
    isIncentiveEnabled
      ? `Hi there,\n\nWe're conducting research to improve our product and would love your feedback.\n\nStudy: {study_name}\nEstimated time: {time_estimate}\nReward: {incentive}\n\nClick here to participate:\n{link}\n\nYour input is valuable and will help us make better decisions.\n\nThank you!`
      : `Hi there,\n\nWe're conducting research to improve our product and would love your feedback.\n\nStudy: {study_name}\nEstimated time: {time_estimate}\n\nClick here to participate:\n{link}\n\nYour input is valuable and will help us make better decisions.\n\nThank you!`
  )

  // Memoize panel options to prevent unnecessary re-renders
  const panelOptions = useMemo(() => ({
    participantUrl,
    primaryColor,
    logoUrl,
    isDraft,
    studyTitle: study.title,
    studyType: study.study_type || 'card_sort',
    hasEmailEnabled,
    emailSubject,
    emailBody,
    timeEstimate,
    incentiveConfig,
  }), [participantUrl, primaryColor, logoUrl, isDraft, study.title, study.study_type, hasEmailEnabled, emailSubject, emailBody, timeEstimate, incentiveConfig])

  // Register right-side settings panel (includes QR code now)
  useRecruitPanels(studyId, panelOptions)

  return (
    <YjsProvider studyId={studyId}>
      {/* Connection status toast (deprecated but kept for consistency) */}

      <Header
        leftContent={
          <StudyNavigationHeader
            projectId={projectId}
            projectName={project.name}
            studyId={studyId}
            studyTitle={study.title}
            studyStatus={(study.status || 'draft') as 'draft' | 'active' | 'paused' | 'completed'}
          />
        }
      >
        <div className="flex items-center gap-2">
          {/* Real-time presence indicators */}
          <div className="flex items-center gap-2 mr-2">
            <SyncStatusIndicator size="sm" showUserCount={false} />
            <CollaborativeAvatars maxVisible={3} size="sm" />
          </div>

          {/* Auto-save status indicator - same as Setup page */}
          {!isDraft && (
            <AutoSaveStatus
              isDirty={isDirty}
              status={saveStatus}
              lastSavedAt={lastSavedAt}
              onSaveNow={isDirty && !isSaving ? saveNow : undefined}
            />
          )}

          {/* Preview Study button - only show for launched studies */}
          {!isDraft && (
            <Button asChild variant="outline" size="sm">
              <a href={participantUrl} target="_blank" rel="noopener noreferrer">
                <Eye className="mr-2 h-4 w-4" />
                Preview Study
              </a>
            </Button>
          )}
        </div>
      </Header>

      <div className="flex flex-1 flex-col gap-4 p-6 min-w-0">
        {isDraft ? (
          // Draft state - show message to launch study
          <div className="max-w-4xl mx-auto w-full">
            <div className="rounded-lg border bg-muted/30 p-8 text-center">
              <h2 className="text-lg font-semibold mb-2">Launch Your Study</h2>
              <p className="text-sm text-muted-foreground mb-4">
                You need to launch your study before you can recruit participants.
              </p>
              <p className="text-sm text-muted-foreground">
                Go to <span className="font-medium">Setup</span> and click <span className="font-medium">Launch Study</span> to get started.
              </p>
            </div>
          </div>
        ) : (
          // Launched state - show distribution content
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Link & Widget */}
            <div className="space-y-6">
              <ParticipantLinkCard
                participantUrl={participantUrl}
                studyCode={studyCode}
                urlSlug={study.url_slug}
                onUrlSlugChange={setUrlSlug}
                isDraft={isDraft}
              />

              <WidgetStatusCard
                studyId={studyId}
                studyCode={studyCode}
                studyTitle={study.title}
                isDraft={isDraft}
                baseUrl={baseUrl}
              />
            </div>

            {/* Right Column - Email Template */}
            <EmailTemplateCard
              studyTitle={study.title}
              participantUrl={participantUrl}
              isDraft={isDraft}
              incentiveConfig={incentiveConfig}
              timeEstimate={timeEstimate}
              subject={emailSubject}
              onSubjectChange={setEmailSubject}
              body={emailBody}
              onBodyChange={setEmailBody}
            />
          </div>
        )}
      </div>
    </YjsProvider>
  )
})
