"use client";

import React from "react";
import { Lock } from "lucide-react";
// Import the player directly rather than through the barrel: barrel re-exports
// are eager, so anything the barrel touches lands in this route's initial
// bundle even when the route never renders it.
import { StudyFlowPlayer } from "@/components/study-flow/player/study-flow-player";
import { ThemeProvider } from "@/components/study-flow/player/theme-provider";
import { BrandingProvider } from "@/components/study-flow/player/branding-provider";
import { StudyBackgroundShell } from "@/components/study-flow/player/study-background-layer";
import { ParticipantStudySkeleton } from "@/components/dashboard/skeletons/player-skeletons";
import {
  PreviewBanner,
  StudyErrorState,
  DuplicateBlockedState,
  PasswordRequiredState,
} from "@/components/study-flow/player/states";
import type { PasswordRequiredResponse } from "@/hooks/use-participant-study";
import type { ParticipantStudyData } from "@/hooks/use-participant-study";
import { StudyTranslationsProvider } from "@/i18n";
import type { SupportedLocale } from "@/i18n/config";
import {
  migrateToStudyFlowSettings,
  cardSortInstructions,
  treeTestInstructions,
  prototypeTestInstructions,
  firstClickInstructions,
  firstImpressionInstructions,
  liveWebsiteTestInstructions,
  defaultActivityInstructionsSettings,
  OLD_CARD_SORT_DEFAULTS,
} from "@/lib/study-flow/defaults";
import type { StudyFlowSettings } from "@veritio/study-types/study-flow-types";
import type { BrandingSettings } from "@/components/builders/shared/types";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { IncentiveProvider } from "@/components/study-flow/player/incentive-context";
import type { IncentiveDisplayConfig } from "@/lib/utils/format-incentive";
import { useStudyId, useStudyMeta } from "@/stores/study-flow-player";
import { StaticWelcome, type SsrWelcomeData } from "./static-welcome";
import { useStudyPlayer } from "./use-study-player";
import { useChunkPreload, collectQuestionTypes } from "./use-chunk-preload";
import type { PreviewFromTarget } from "@/lib/study-flow/preview-from";
import {
  FigmaPreloader,
  CardSortActivity,
  TreeTestActivity,
  PrototypeTestActivity,
  FirstClickActivity,
  FirstImpressionActivity,
  LiveWebsiteActivity,
  LiveWebsiteMobileBlocker,
  getHasPracticeRound,
  shouldBlockMobile,
  getEffectiveVariantId,
} from "./study-type-renderers";

export interface StudyPlayerClientProps {
  studyCode: string;
  initialStudy: ParticipantStudyData | null;
  initialPasswordRequired: PasswordRequiredResponse | null;
  initialError: string | null;
  /** Appearance-only data available for closed and other restricted states. */
  initialBranding?: BrandingSettings | null;
  isPreviewMode: boolean;
  /** True inside the device-emulation iframe — the chrome lives in the outer frame. */
  isEmbeddedPreview?: boolean;
  /** Study language locale for translations */
  locale: SupportedLocale;
  /** Translation messages for the locale */
  messages: Record<string, unknown>;
  /** Incentive configuration for display to participants */
  incentiveConfig?: IncentiveDisplayConfig | null;
  /** Server-rendered welcome card data — non-null only when the participant will start on the welcome step */
  ssrWelcome?: SsrWelcomeData | null;
  previewFrom?: PreviewFromTarget | null;
}

function ParticipantAppearance({
  branding,
  children,
}: {
  branding: BrandingSettings | null | undefined;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider themeMode={branding?.themeMode}>
      <BrandingProvider branding={branding}>
        <StudyBackgroundShell branding={branding}>
          {children}
        </StudyBackgroundShell>
      </BrandingProvider>
    </ThemeProvider>
  );
}

export function StudyPlayerClient({
  studyCode,
  initialStudy,
  initialPasswordRequired,
  initialError,
  initialBranding = null,
  isPreviewMode,
  isEmbeddedPreview = false,
  locale,
  messages,
  incentiveConfig,
  ssrWelcome = null,
  previewFrom = null,
}: StudyPlayerClientProps) {
  const {
    hasMounted,
    study,
    passwordRequired,
    error,
    isLoading,
    isPasswordError,
    isBlocked,
    blockMessage,
    preventionData,
    currentStep,
    participantId,
    sessionToken,
    assignedVariantId,
    restoredProgress,
    isRestorationComplete,
    submittedPassword,
    isWidgetParticipant,
    participantDemographicData,
    handleFlowComplete,
    handleScreeningReject,
    handleActivityComplete,
    handlePasswordSubmit,
  } = useStudyPlayer({
    studyCode,
    initialStudy,
    initialPasswordRequired,
    initialError,
    isPreviewMode,
  });

  // Store-initialization signal: studyMeta is NOT persisted, so it is only
  // non-null after StudyFlowPlayer's initialize() ran for this study.
  // (studyId alone is unreliable — it IS persisted and rehydrates for
  // returning participants before initialize() runs.)
  const storeStudyId = useStudyId();
  const storeStudyMeta = useStudyMeta();
  const storeReady =
    !!initialStudy &&
    storeStudyId === initialStudy.id &&
    storeStudyMeta !== null;

  // Warm this study's player + heavy question chunks while the participant is
  // still on the welcome card, so clicking "Start" does not begin a download.
  // Must stay above the early returns below to keep hook order stable.
  useChunkPreload({
    studyType: study?.study_type,
    questionTypes: collectQuestionTypes(study),
    enabled: !!study,
  });

  const staticWelcome = ssrWelcome ? (
    <StaticWelcome data={ssrWelcome} locale={locale} messages={messages} />
  ) : null;
  const availableBranding = (study?.branding ||
    initialStudy?.branding ||
    initialPasswordRequired?.branding ||
    initialBranding) as BrandingSettings | null | undefined;

  // Error state - check BEFORE loading to ensure errors are shown immediately
  if (error && !isPasswordError) {
    return (
      <ParticipantAppearance branding={availableBranding}>
        <StudyErrorState message={error} />
      </ParticipantAppearance>
    );
  }

  // Until the client has mounted, render the server-renderable welcome card when
  // we have one (this is also exactly what the SSR HTML contains — the study is
  // visible before any JS executes). Otherwise fall back to the skeleton.
  if (!hasMounted) {
    return (
      staticWelcome ?? (
        <ParticipantAppearance branding={availableBranding}>
          <ParticipantStudySkeleton />
        </ParticipantAppearance>
      )
    );
  }

  // Loading states (only show if no error)
  if (isLoading || (restoredProgress && !isRestorationComplete)) {
    return (
      staticWelcome ?? (
        <ParticipantAppearance branding={availableBranding}>
          <ParticipantStudySkeleton />
        </ParticipantAppearance>
      )
    );
  }

  // Blocked by duplicate prevention
  if (isBlocked) {
    return (
      <ParticipantAppearance branding={availableBranding}>
        <DuplicateBlockedState message={blockMessage ?? undefined} />
      </ParticipantAppearance>
    );
  }

  // Password entry screen
  if (passwordRequired) {
    return (
      <ParticipantAppearance branding={passwordRequired.branding}>
        <StudyTranslationsProvider locale={locale} messages={messages}>
          <PasswordRequiredState
            title={passwordRequired.title}
            branding={passwordRequired.branding}
            onSubmit={handlePasswordSubmit}
            isSubmitting={isLoading && submittedPassword !== undefined}
            error={isPasswordError ? "password.incorrect" : null}
          />
        </StudyTranslationsProvider>
      </ParticipantAppearance>
    );
  }

  if (!study) {
    return (
      <ParticipantAppearance branding={availableBranding}>
        <StudyErrorState />
      </ParticipantAppearance>
    );
  }

  // Get settings and flow settings
  const rawSettings =
    study.settings &&
    typeof study.settings === "object" &&
    !Array.isArray(study.settings)
      ? (study.settings as Record<string, unknown>)
      : {};

  const flowSettings = migrateToStudyFlowSettings(
    study.welcome_message,
    study.thank_you_message,
    rawSettings.studyFlow as Partial<StudyFlowSettings> | undefined,
    study.study_type as
      | "card_sort"
      | "tree_test"
      | "survey"
      | "prototype_test"
      | "first_click"
      | "first_impression"
      | "live_website_test",
  );

  // Force instructions for activity-based study types (not survey)
  if (study.study_type !== "survey") {
    flowSettings.activityInstructions.enabled = true;
  }

  // Runtime correction: fix stale/wrong instructions saved from creation bugs.
  if (study.study_type === "card_sort") {
    const STALE_DEFAULTS = [
      liveWebsiteTestInstructions.part1,
      treeTestInstructions.part1,
      prototypeTestInstructions.part1,
      firstClickInstructions.part1,
      firstImpressionInstructions.part1,
      defaultActivityInstructionsSettings.part1,
      ...OLD_CARD_SORT_DEFAULTS,
    ];
    const currentPart1 = flowSettings.activityInstructions.part1?.trim();
    if (
      currentPart1 &&
      STALE_DEFAULTS.some((d) => d?.trim() === currentPart1)
    ) {
      const mode = (rawSettings.mode as string) || "open";
      const modeKey = (
        ["open", "closed", "hybrid"].includes(mode) ? mode : "open"
      ) as keyof typeof cardSortInstructions;
      flowSettings.activityInstructions.part1 =
        cardSortInstructions[modeKey].part1;
      flowSettings.activityInstructions.part2 =
        cardSortInstructions[modeKey].part2;
    }
  }

  const studyMeta = {
    title: study.title,
    description: study.description || null,
    purpose: study.purpose || null,
    participantRequirements: study.participant_requirements || null,
  };

  const commonFlowProps = {
    studyId: study.id,
    participantId: (participantId || "") as string,
    settings: flowSettings,
    screeningQuestions: study.screening_questions || [],
    branding: study.branding as BrandingSettings | undefined,
    studyMeta,
    onFlowComplete: handleFlowComplete,
    onScreeningReject: handleScreeningReject,
    studyCode,
    sessionToken: sessionToken || undefined,
    isPreviewMode,
    welcomePrerendered: !!ssrWelcome,
    previewFrom,
  };

  // Inside the device-emulation iframe the banner is rendered by the outer
  // shell — repeating it here would eat the emulated viewport's height.
  const previewBanner =
    isPreviewMode && !isEmbeddedPreview ? <PreviewBanner /> : null;

  const activityProps = {
    study,
    studyCode,
    rawSettings,
    flowSettings,
    currentStep,
    participantId,
    sessionToken,
    isPreviewMode,
    preventionData,
    assignedVariantId,
    previewTaskId: previewFrom?.kind === "task" ? previewFrom.id : null,
    participantDemographicData: participantDemographicData as
      Record<string, string> | null | undefined,
    onActivityComplete: handleActivityComplete,
  };

  const renderPlayerContent = () => {
    // Card Sort Player
    if (study.study_type === "card_sort") {
      return (
        <IncentiveProvider
          config={incentiveConfig ?? null}
          isWidgetParticipant={isWidgetParticipant}
        >
          <StudyTranslationsProvider locale={locale} messages={messages}>
            {previewBanner}
            <StudyFlowPlayer
              {...commonFlowProps}
              studyType="card_sort"
              preStudyQuestions={study.pre_study_questions || []}
              postStudyQuestions={study.post_study_questions || []}
            >
              <CardSortActivity {...activityProps} />
            </StudyFlowPlayer>
          </StudyTranslationsProvider>
        </IncentiveProvider>
      );
    }

    // Tree Test Player
    if (study.study_type === "tree_test") {
      return (
        <IncentiveProvider
          config={incentiveConfig ?? null}
          isWidgetParticipant={isWidgetParticipant}
        >
          <StudyTranslationsProvider locale={locale} messages={messages}>
            {previewBanner}
            <StudyFlowPlayer
              {...commonFlowProps}
              studyType="tree_test"
              preStudyQuestions={study.pre_study_questions || []}
              postStudyQuestions={study.post_study_questions || []}
            >
              <TreeTestActivity {...activityProps} />
            </StudyFlowPlayer>
          </StudyTranslationsProvider>
        </IncentiveProvider>
      );
    }

    // Survey Player
    if (study.study_type === "survey") {
      return (
        <IncentiveProvider
          config={incentiveConfig ?? null}
          isWidgetParticipant={isWidgetParticipant}
        >
          <StudyTranslationsProvider locale={locale} messages={messages}>
            {previewBanner}
            <StudyFlowPlayer
              {...commonFlowProps}
              studyType="survey"
              preStudyQuestions={[]}
              postStudyQuestions={[]}
              surveyQuestions={study.survey_questions || []}
              initialRules={study.survey_rules}
            />
          </StudyTranslationsProvider>
        </IncentiveProvider>
      );
    }

    // Prototype Test Player
    if (study.study_type === "prototype_test") {
      const shouldPreloadFigma =
        currentStep !== "activity" &&
        currentStep !== "thank_you" &&
        currentStep !== "rejected" &&
        currentStep !== "closed" &&
        study.prototype_test_prototype;

      return (
        <IncentiveProvider
          config={incentiveConfig ?? null}
          isWidgetParticipant={isWidgetParticipant}
        >
          <StudyTranslationsProvider locale={locale} messages={messages}>
            {previewBanner}
            {shouldPreloadFigma && (
              <FigmaPreloader
                prototype={study.prototype_test_prototype}
                frames={study.prototype_test_frames || []}
                tasks={study.prototype_test_tasks || []}
              />
            )}
            <StudyFlowPlayer
              {...commonFlowProps}
              studyType="prototype_test"
              preStudyQuestions={study.pre_study_questions || []}
              postStudyQuestions={study.post_study_questions || []}
            >
              <PrototypeTestActivity {...activityProps} />
            </StudyFlowPlayer>
          </StudyTranslationsProvider>
        </IncentiveProvider>
      );
    }

    // First-Click Test Player
    if (study.study_type === "first_click") {
      return (
        <IncentiveProvider
          config={incentiveConfig ?? null}
          isWidgetParticipant={isWidgetParticipant}
        >
          <StudyTranslationsProvider locale={locale} messages={messages}>
            {previewBanner}
            <StudyFlowPlayer
              {...commonFlowProps}
              studyType="first_click"
              preStudyQuestions={study.pre_study_questions || []}
              postStudyQuestions={study.post_study_questions || []}
            >
              <FirstClickActivity {...activityProps} />
            </StudyFlowPlayer>
          </StudyTranslationsProvider>
        </IncentiveProvider>
      );
    }

    // First Impression Test Player
    if (study.study_type === "first_impression") {
      const hasPracticeRound = getHasPracticeRound(study);

      return (
        <IncentiveProvider
          config={incentiveConfig ?? null}
          isWidgetParticipant={isWidgetParticipant}
        >
          <StudyTranslationsProvider locale={locale} messages={messages}>
            {previewBanner}
            <StudyFlowPlayer
              {...commonFlowProps}
              studyType="first_impression"
              preStudyQuestions={study.pre_study_questions || []}
              postStudyQuestions={study.post_study_questions || []}
              hasPracticeRound={hasPracticeRound}
            >
              <FirstImpressionActivity {...activityProps} />
            </StudyFlowPlayer>
          </StudyTranslationsProvider>
        </IncentiveProvider>
      );
    }

    // Live Website Test Player
    if (study.study_type === "live_website_test") {
      // Block mobile/tablet devices when allowMobile is disabled
      if (shouldBlockMobile(rawSettings)) {
        return <LiveWebsiteMobileBlocker />;
      }

      const effectiveVariantId = getEffectiveVariantId(
        assignedVariantId,
        isPreviewMode,
        rawSettings,
        study,
      );

      return (
        <IncentiveProvider
          config={incentiveConfig ?? null}
          isWidgetParticipant={isWidgetParticipant}
        >
          <StudyTranslationsProvider locale={locale} messages={messages}>
            {previewBanner}
            <StudyFlowPlayer
              {...commonFlowProps}
              studyType="live_website_test"
              preStudyQuestions={[]}
              postStudyQuestions={study.post_study_questions || []}
            >
              <LiveWebsiteActivity
                {...activityProps}
                effectiveVariantId={effectiveVariantId}
              />
            </StudyFlowPlayer>
          </StudyTranslationsProvider>
        </IncentiveProvider>
      );
    }

    // Unknown study type fallback
    return (
      <StudyTranslationsProvider locale={locale} messages={messages}>
        <div
          className="min-h-screen flex items-center justify-center p-4"
          style={{ backgroundColor: "var(--style-page-bg, #f8fafc)" }}
        >
          <UICard
            className="max-w-md w-full"
            style={{
              backgroundColor:
                "var(--style-content-surface-bg-fallback, var(--style-card-bg, white))",
              background:
                "var(--style-content-surface-bg, var(--style-card-bg, white))",
              backdropFilter:
                "var(--style-content-surface-backdrop-filter, none)",
              WebkitBackdropFilter:
                "var(--style-content-surface-backdrop-filter, none)",
            }}
          >
            <CardContent className="pt-6 text-center">
              <Lock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">{study.title}</h1>
              <p className="text-muted-foreground">
                This study type is not supported.
              </p>
            </CardContent>
          </UICard>
        </div>
      </StudyTranslationsProvider>
    );
  };

  const renderPlayer = () => (
    <ParticipantAppearance
      branding={study.branding as BrandingSettings | undefined}
    >
      {renderPlayerContent()}
    </ParticipantAppearance>
  );

  // Paths that never mount StudyFlowPlayer (mobile blocker, unknown type) must
  // not sit behind the static-welcome overlay — the store would never initialize.
  const willMountPlayer =
    [
      "card_sort",
      "tree_test",
      "survey",
      "prototype_test",
      "first_click",
      "first_impression",
      "live_website_test",
    ].includes(study.study_type) &&
    !(
      study.study_type === "live_website_test" && shouldBlockMobile(rawSettings)
    );

  // Keep the SSR welcome card visible until the player store has initialized;
  // the real player mounts hidden underneath (its initialize()/session effects
  // still run), then swaps in without entrance animations — pixel-stable.
  if (staticWelcome && !storeReady && willMountPlayer) {
    return (
      <>
        {staticWelcome}
        <div style={{ display: "none" }} aria-hidden>
          {renderPlayer()}
        </div>
      </>
    );
  }

  return renderPlayer();
}
