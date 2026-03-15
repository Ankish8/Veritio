'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Monitor } from 'lucide-react'
import {
  CardSortPlayerSkeleton,
  TreeTestPlayerSkeleton,
  PrototypeTestPlayerSkeleton,
  FirstClickPlayerSkeleton,
} from '@/components/dashboard/skeletons'
import type { ParticipantStudyData } from '@/hooks/use-participant-study'
import type { TreeTestSettings, PrototypeTestSettings, CardWithImage, PrototypeScaleMode, FirstClickTestSettings } from '@veritio/study-types'
import type { ExtendedFirstImpressionSettings } from '@veritio/study-types/study-flow-types'
import type { BrandingSettings } from '@/components/builders/shared/types'
import type { StudyFlowSettings } from '@veritio/study-types/study-flow-types'
import type { ResponsePreventionData } from '@/hooks/use-response-prevention'
import { getBrowserData } from '@/lib/browser-detection'
import { PostTaskQuestionsScreen as RealPostTaskQuestionsScreen } from '@/components/players/shared/post-task-questions-screen'

// PERFORMANCE: Dynamic imports for heavy player components
const CardSortPlayer = dynamic(
  () => import('@/components/players/card-sort').then(mod => ({ default: mod.CardSortPlayer })),
  { loading: () => <CardSortPlayerSkeleton />, ssr: false }
)

const TreeTestPlayer = dynamic(
  () => import('@/components/players/tree-test').then(mod => ({ default: mod.TreeTestPlayer })),
  { loading: () => <TreeTestPlayerSkeleton />, ssr: false }
)

const PrototypeTestPlayer = dynamic(
  () => import('@veritio/prototype-test/player').then(mod => ({ default: mod.PrototypeTestPlayer })),
  { loading: () => <PrototypeTestPlayerSkeleton />, ssr: false }
)

const FirstClickPlayer = dynamic(
  () => import('@/components/players/first-click').then(mod => ({ default: mod.FirstClickPlayer })),
  { loading: () => <FirstClickPlayerSkeleton />, ssr: false }
)

const FirstImpressionPlayer = dynamic(
  () => import('@/components/players/first-impression').then(mod => ({ default: mod.FirstImpressionPlayer })),
  { loading: () => <FirstClickPlayerSkeleton />, ssr: false } // Reuse skeleton
)

const LiveWebsitePlayer = dynamic(
  () => import('@/components/players/live-website').then(mod => ({ default: mod.LiveWebsitePlayer })),
  { loading: () => <FirstClickPlayerSkeleton />, ssr: false }
)

// Lightweight preloader for Figma (loads eagerly, not dynamically)
export const FigmaPreloader = dynamic(
  () => import('@veritio/prototype-test/player').then(mod => ({ default: mod.FigmaPreloader })),
  { ssr: false }
)

export interface StudyActivityRendererProps {
  study: ParticipantStudyData
  studyCode: string
  rawSettings: Record<string, unknown>
  flowSettings: StudyFlowSettings
  currentStep: string
  participantId: string | null
  sessionToken: string | null
  isPreviewMode: boolean
  preventionData: ResponsePreventionData
  assignedVariantId: string | null
  participantDemographicData: Record<string, string> | null | undefined
  onActivityComplete: () => void
}

// ── Card Sort ──────────────────────────────────────────────────

export function CardSortActivity({
  study, studyCode, rawSettings, flowSettings, currentStep,
  participantId, sessionToken, isPreviewMode, preventionData, onActivityComplete,
}: StudyActivityRendererProps) {
  const cardSortSettings = {
    mode: (rawSettings.mode as 'open' | 'closed' | 'hybrid') || 'open',
    randomizeCards: rawSettings.randomizeCards as boolean ?? true,
    randomizeCategories: rawSettings.randomizeCategories as boolean ?? false,
    allowSkip: rawSettings.allowSkip as boolean ?? false,
    showProgress: rawSettings.showProgress as boolean ?? true,
    cardLimit: rawSettings.cardLimit as number | undefined,
    requireAllCardsSorted: rawSettings.requireAllCardsSorted as boolean | undefined,
    requireCategoriesNamed: rawSettings.requireCategoriesNamed as boolean | undefined,
    includeUnclearCategory: rawSettings.includeUnclearCategory as boolean | undefined,
    showCategoryDescriptions: rawSettings.showCategoryDescriptions as boolean | undefined,
    sessionRecordingSettings: (study as any).session_recording_settings,
  }

  const activityInstructions = flowSettings.activityInstructions.enabled
    ? {
        title: flowSettings.activityInstructions.title,
        part1: flowSettings.activityInstructions.part1,
        part2: flowSettings.activityInstructions.part2,
      }
    : undefined

  if (currentStep !== 'activity') return null

  return participantId ? (
    <CardSortPlayer
      studyId={study.id}
      shareCode={studyCode}
      cards={(study.cards || []) as CardWithImage[]}
      categories={study.categories || []}
      settings={cardSortSettings}
      welcomeMessage=""
      thankYouMessage=""
      instructions={activityInstructions}
      onComplete={onActivityComplete}
      embeddedMode
      previewMode={isPreviewMode}
      branding={study.branding as BrandingSettings | undefined}
      preventionData={preventionData}
      sessionToken={sessionToken}
      participantId={participantId || undefined}
    />
  ) : (
    <CardSortPlayerSkeleton />
  )
}

// ── Tree Test ──────────────────────────────────────────────────

export function TreeTestActivity({
  study, studyCode, rawSettings, currentStep,
  participantId, sessionToken, isPreviewMode, preventionData, onActivityComplete,
}: StudyActivityRendererProps) {
  const treeTestSettings: TreeTestSettings = {
    randomizeTasks: rawSettings.randomizeTasks as boolean ?? true,
    showBreadcrumbs: rawSettings.showBreadcrumbs as boolean ?? true,
    allowBack: rawSettings.allowBack as boolean ?? true,
    showTaskProgress: rawSettings.showTaskProgress as boolean ?? true,
    allowSkipTasks: rawSettings.allowSkipTasks as boolean ?? true,
    dontRandomizeFirstTask: rawSettings.dontRandomizeFirstTask as boolean ?? false,
    answerButtonText: rawSettings.answerButtonText as string ?? "I'd find it here",
  }

  if (currentStep !== 'activity') return null

  return participantId ? (
    <TreeTestPlayer
      studyId={study.id}
      shareCode={studyCode}
      tasks={study.tasks || []}
      nodes={study.tree_nodes || []}
      settings={treeTestSettings}
      welcomeMessage=""
      thankYouMessage=""
      onComplete={onActivityComplete}
      embeddedMode
      previewMode={isPreviewMode}
      sessionToken={sessionToken || undefined}
      preventionData={preventionData}
    />
  ) : (
    <TreeTestPlayerSkeleton />
  )
}

// ── Prototype Test ─────────────────────────────────────────────

export function PrototypeTestActivity({
  study, studyCode, rawSettings, currentStep,
  participantId, sessionToken, isPreviewMode, preventionData, onActivityComplete,
}: StudyActivityRendererProps) {
  const prototypeTestSettings: PrototypeTestSettings = {
    randomizeTasks: rawSettings.randomizeTasks as boolean ?? true,
    allowSkipTasks: rawSettings.allowSkipTasks as boolean ?? true,
    allowFailureResponse: rawSettings.allowFailureResponse as boolean ?? false,
    showTaskProgress: rawSettings.showTaskProgress as boolean ?? true,
    dontRandomizeFirstTask: rawSettings.dontRandomizeFirstTask as boolean ?? true,
    clickableAreaFlashing: rawSettings.clickableAreaFlashing as boolean ?? true,
    tasksEndAutomatically: rawSettings.tasksEndAutomatically as boolean ?? true,
    showEachParticipantTasks: (rawSettings.showEachParticipantTasks as 'all' | number) ?? 'all',
    taskInstructionPosition: (rawSettings.taskInstructionPosition as PrototypeTestSettings['taskInstructionPosition']) ?? 'top-left',
    scalePrototype: (rawSettings.scalePrototype as PrototypeScaleMode | boolean) ?? 'fit',
    trackHesitation: rawSettings.trackHesitation as boolean ?? rawSettings.trackNonClickEvents as boolean ?? false,
    sessionRecordingSettings: (study as any).session_recording_settings as PrototypeTestSettings['sessionRecordingSettings'],
  }

  if (currentStep !== 'activity') return null

  return participantId ? (
    <PrototypeTestPlayer
      studyId={study.id}
      shareCode={studyCode}
      prototype={study.prototype_test_prototype}
      frames={study.prototype_test_frames || []}
      componentInstances={study.prototype_test_component_instances || []}
      tasks={study.prototype_test_tasks || []}
      settings={prototypeTestSettings}
      onComplete={onActivityComplete}
      embeddedMode
      previewMode={isPreviewMode}
      sessionToken={sessionToken || undefined}
      participantId={participantId || undefined}
      preventionData={preventionData}
      PostTaskQuestionsComponent={RealPostTaskQuestionsScreen}
    />
  ) : (
    <PrototypeTestPlayerSkeleton />
  )
}

// ── First Click ────────────────────────────────────────────────

export function FirstClickActivity({
  study, studyCode, rawSettings, currentStep,
  participantId, sessionToken, isPreviewMode, preventionData, onActivityComplete,
}: StudyActivityRendererProps) {
  const firstClickSettings: FirstClickTestSettings = {
    allowSkipTasks: rawSettings.allowSkipTasks as boolean ?? rawSettings.allow_skip_tasks as boolean ?? true,
    startTasksImmediately: rawSettings.startTasksImmediately as boolean ?? rawSettings.start_tasks_immediately as boolean ?? false,
    randomizeTasks: rawSettings.randomizeTasks as boolean ?? rawSettings.randomize_tasks as boolean ?? true,
    dontRandomizeFirstTask: rawSettings.dontRandomizeFirstTask as boolean ?? rawSettings.dont_randomize_first_task as boolean ?? true,
    showEachParticipantTasks: (rawSettings.showEachParticipantTasks ?? rawSettings.show_each_participant_tasks ?? 'all') as 'all' | number,
    showTaskProgress: rawSettings.showTaskProgress as boolean ?? rawSettings.show_task_progress as boolean ?? true,
    imageScaling: (rawSettings.imageScaling ?? rawSettings.image_scaling ?? 'scale_on_small') as FirstClickTestSettings['imageScaling'],
    taskInstructionPosition: (rawSettings.taskInstructionPosition ?? rawSettings.task_instruction_position ?? 'top-left') as FirstClickTestSettings['taskInstructionPosition'],
  }

  if (currentStep !== 'activity') return null

  return participantId ? (
    <FirstClickPlayer
      studyId={study.id}
      shareCode={studyCode}
      tasks={study.first_click_tasks || []}
      settings={firstClickSettings}
      embeddedMode
      onComplete={onActivityComplete}
      previewMode={isPreviewMode}
      preventionData={preventionData}
      sessionToken={sessionToken || undefined}
      participantId={participantId || undefined}
    />
  ) : (
    <FirstClickPlayerSkeleton />
  )
}

// ── First Impression ───────────────────────────────────────────

export function FirstImpressionActivity({
  study, studyCode, rawSettings, currentStep,
  participantId, sessionToken, isPreviewMode, preventionData, onActivityComplete,
}: StudyActivityRendererProps) {
  const firstImpressionSettings: ExtendedFirstImpressionSettings = {
    exposureDurationMs: (rawSettings.exposureDurationMs as number) ?? 5000,
    countdownDurationMs: (rawSettings.countdownDurationMs as number) ?? 3000,
    showTimerToParticipant: (rawSettings.showTimerToParticipant as boolean) ?? true,
    showProgressIndicator: (rawSettings.showProgressIndicator as boolean) ?? true,
    displayMode: (rawSettings.displayMode as 'fit' | 'fill' | 'actual' | 'hidpi') ?? 'fit',
    backgroundColor: (rawSettings.backgroundColor as string) ?? '#ffffff',
    questionDisplayMode: (rawSettings.questionDisplayMode as 'one_per_page' | 'all_on_page') ?? 'one_per_page',
    randomizeQuestions: (rawSettings.randomizeQuestions as boolean) ?? false,
    designAssignmentMode: (rawSettings.designAssignmentMode as 'random_single' | 'sequential_all') ?? 'random_single',
    allowPracticeDesign: (rawSettings.allowPracticeDesign as boolean) ?? false,
    sessionRecordingSettings: (study as any).session_recording_settings,
  }

  // Transform designs from database format to player format
  const designs = ((study as any).first_impression_designs || []).map((d: any) => ({
    id: d.id,
    name: d.name,
    position: d.position,
    image_url: d.image_url,
    original_filename: d.original_filename,
    width: d.width,
    height: d.height,
    mobile_image_url: d.mobile_image_url,
    mobile_width: d.mobile_width,
    mobile_height: d.mobile_height,
    display_mode: d.display_mode || 'fit',
    background_color: d.background_color || '#ffffff',
    weight: d.weight || 100,
    is_practice: d.is_practice || false,
    questions: d.questions || [],
  }))

  if (currentStep !== 'activity') return null

  return participantId ? (
    <FirstImpressionPlayer
      studyId={study.id}
      shareCode={studyCode}
      designs={designs}
      settings={firstImpressionSettings}
      embeddedMode
      onComplete={onActivityComplete}
      previewMode={isPreviewMode}
      sessionToken={sessionToken || undefined}
      participantId={participantId || undefined}
      preventionData={preventionData}
    />
  ) : (
    <FirstClickPlayerSkeleton />
  )
}

/** Check if first impression designs include a practice round */
export function getHasPracticeRound(study: ParticipantStudyData): boolean {
  const designs = (study as any).first_impression_designs || []
  return designs.some((d: { is_practice: boolean }) => d.is_practice)
}

// ── Live Website ───────────────────────────────────────────────

export function LiveWebsiteMobileBlocker() {
  return (
    <div
      className="flex items-center justify-center min-h-screen p-4"
      style={{ backgroundColor: 'var(--style-page-bg)' }}
    >
      <div
        className="max-w-md w-full p-8 text-center"
        style={{
          backgroundColor: 'var(--style-card-bg)',
          border: '1px solid var(--style-card-border)',
          borderRadius: 'var(--style-radius-lg)',
          boxShadow: 'var(--style-shadow)',
        }}
      >
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{ backgroundColor: 'var(--brand-light)' }}
        >
          <Monitor className="h-8 w-8" style={{ color: 'var(--brand)' }} />
        </div>
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--style-text-primary)' }}>
          Desktop Required
        </h1>
        <p style={{ color: 'var(--style-text-secondary)' }}>
          This study requires a desktop or laptop computer. Please open this link on a desktop browser to participate.
        </p>
      </div>
    </div>
  )
}

export interface LiveWebsiteActivityProps extends StudyActivityRendererProps {
  effectiveVariantId: string | null
}

export function LiveWebsiteActivity({
  study, studyCode, rawSettings, currentStep,
  participantId, sessionToken, isPreviewMode, preventionData,
  participantDemographicData, onActivityComplete, effectiveVariantId,
}: LiveWebsiteActivityProps) {
  const liveWebsiteSettings = {
    mode: ((rawSettings.mode as string) ?? 'url_only') as 'url_only' | 'snippet',
    websiteUrl: (rawSettings.websiteUrl as string) || '',
    snippetId: (rawSettings.snippetId as string) ?? null,
    recordScreen: (rawSettings.recordScreen as boolean) ?? true,
    recordWebcam: (rawSettings.recordWebcam as boolean) ?? false,
    recordMicrophone: (rawSettings.recordMicrophone as boolean) ?? true,
    allowMobile: (rawSettings.allowMobile as boolean) ?? false,
    allowSkipTasks: (rawSettings.allowSkipTasks as boolean) ?? true,
    showTaskProgress: (rawSettings.showTaskProgress as boolean) ?? true,
    defaultTimeLimitSeconds: (rawSettings.defaultTimeLimitSeconds as number) ?? null,
    authInstructions: (rawSettings.authInstructions as string) || null,
    widgetPosition: ((rawSettings.widgetPosition as string) ?? 'bottom-right') as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left',
    blockBeforeStart: (rawSettings.blockBeforeStart as boolean) ?? false,
    abTestingEnabled: (rawSettings.abTestingEnabled as boolean) ?? false,
    thinkAloud: (rawSettings.thinkAloud as any) ?? undefined,
  }

  // Merge per-variant overrides into tasks
  const baseTasks = study.live_website_tasks || []
  const mergedTasks = (() => {
    if (!effectiveVariantId || !study.live_website_task_variants?.length) return baseTasks
    const tvMap = new Map<string, (typeof study.live_website_task_variants)[number]>()
    for (const tv of study.live_website_task_variants) {
      if (tv.variant_id === effectiveVariantId) tvMap.set(tv.task_id, tv)
    }
    if (tvMap.size === 0) return baseTasks
    return baseTasks.map(task => {
      const tv = tvMap.get(task.id)
      if (!tv) return task
      return {
        ...task,
        target_url: tv.starting_url || task.target_url,
        success_criteria_type: tv.success_criteria_type ?? task.success_criteria_type,
        success_url: tv.success_url ?? task.success_url,
        success_path: tv.success_path ?? task.success_path,
        time_limit_seconds: tv.time_limit_seconds ?? task.time_limit_seconds,
      }
    })
  })()

  if (currentStep !== 'activity') return null

  return participantId ? (
    <LiveWebsitePlayer
      studyId={study.id}
      shareCode={studyCode}
      tasks={mergedTasks as import('@/components/players/live-website/types').LiveWebsiteTask[]}
      settings={liveWebsiteSettings}
      branding={study.branding as BrandingSettings | undefined}
      embeddedMode
      onComplete={onActivityComplete}
      previewMode={isPreviewMode}
      preventionData={preventionData}
      sessionToken={sessionToken || undefined}
      participantId={participantId || undefined}
      participantDemographicData={participantDemographicData as Record<string, string> | null | undefined}
      assignedVariantId={effectiveVariantId}
      abVariants={study.live_website_variants}
    />
  ) : (
    <FirstClickPlayerSkeleton />
  )
}

/** Check if mobile should be blocked for live website tests */
export function shouldBlockMobile(rawSettings: Record<string, unknown>): boolean {
  const allowMobile = (rawSettings.allowMobile as boolean) ?? false
  if (allowMobile) return false
  const deviceType = getBrowserData().deviceType
  return deviceType === 'Mobile' || deviceType === 'Tablet'
}

/** Get effective variant ID for live website A/B testing */
export function getEffectiveVariantId(
  assignedVariantId: string | null,
  isPreviewMode: boolean,
  rawSettings: Record<string, unknown>,
  study: ParticipantStudyData,
): string | null {
  return assignedVariantId || (
    isPreviewMode && (rawSettings.abTestingEnabled as boolean) && study.live_website_variants?.length
      ? study.live_website_variants[0].id
      : null
  )
}
