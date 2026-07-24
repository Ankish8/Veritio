"use client";

import { FadeIn, ButtonBounce } from "../css-animations";
import { useTranslations } from "next-intl";
import {
  useFlowSettings,
  useStudyMeta,
  usePlayerActions,
} from "@/stores/study-flow-player";
import { KeyboardShortcutHint } from "@/components/ui/keyboard-shortcut-hint";
import { useGlobalKeyboardShortcuts } from "../use-global-keyboard-shortcuts";
import { useStepTransition } from "../use-step-transition";
import { BrandedButton } from "../step-layout";
import { useIncentiveConfig } from "../incentive-context";
import {
  replaceIncentivePlaceholder,
  shouldShowIncentive,
} from "@/lib/utils/format-incentive";
import DOMPurify from "dompurify";
import { useMemo } from "react";
import { WelcomeContent } from "./welcome-content";

export function WelcomeStep({
  prerendered = false,
}: {
  prerendered?: boolean;
}) {
  const t = useTranslations();
  const flowSettings = useFlowSettings();
  const { nextStep } = usePlayerActions();
  const incentiveConfig = useIncentiveConfig();

  const { isTransitioning, isAnimating, triggerTransition } = useStepTransition(
    {
      onTransitionEnd: nextStep,
    },
  );

  const handleStart = () => {
    if (!isAnimating) triggerTransition();
  };

  useGlobalKeyboardShortcuts({
    onEnter: handleStart,
  });
  const studyMeta = useStudyMeta();
  const sanitizedPurpose = useMemo(
    () => (studyMeta?.purpose ? DOMPurify.sanitize(studyMeta.purpose) : ""),
    [studyMeta?.purpose],
  );
  const sanitizedRequirements = useMemo(
    () =>
      studyMeta?.participantRequirements
        ? DOMPurify.sanitize(studyMeta.participantRequirements)
        : "",
    [studyMeta?.participantRequirements],
  );
  const sanitizedMessage = useMemo(
    () =>
      flowSettings.welcome.message
        ? DOMPurify.sanitize(flowSettings.welcome.message)
        : "",
    [flowSettings.welcome.message],
  );

  // Show incentive card if:
  // 1. Toggle is enabled in flow settings (builder)
  // 2. Participant came from widget (incentives are widget-exclusive)
  // 3. Incentive is actually configured with valid amount
  const displayIncentive =
    flowSettings.welcome.showIncentive && shouldShowIncentive(incentiveConfig);
  // Use default message if not set (for studies created before this feature)
  const rawIncentiveMessage =
    flowSettings.welcome.incentiveMessage ||
    "Complete this study and receive {incentive}";
  const incentiveMessage = displayIncentive
    ? replaceIncentivePlaceholder(rawIncentiveMessage, incentiveConfig)
    : null;

  return (
    <WelcomeContent
      welcome={flowSettings.welcome}
      studyMeta={studyMeta}
      sanitizedPurpose={sanitizedPurpose}
      sanitizedRequirements={sanitizedRequirements}
      sanitizedMessage={sanitizedMessage}
      incentiveMessage={incentiveMessage}
      animate={!prerendered}
      actions={
        <FadeIn
          className="flex sm:justify-end"
          delay={prerendered ? 0 : 0.4}
          duration={prerendered ? 0 : undefined}
        >
          <ButtonBounce isActive={isTransitioning}>
            <BrandedButton onClick={handleStart}>
              {t("common.getStarted")}
              <KeyboardShortcutHint shortcut="enter" variant="dark" />
            </BrandedButton>
          </ButtonBounce>
        </FadeIn>
      }
    />
  );
}
