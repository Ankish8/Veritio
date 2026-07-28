"use client";

import { useTranslations } from "next-intl";
import {
  FadeIn,
  ButtonBounce,
  AnimationStyles,
} from "@/components/study-flow/player/css-animations";
import { WelcomeContent } from "@/components/study-flow/player/steps/welcome-content";
import { BrandedButton } from "@/components/study-flow/player/step-layout";
import { ThemeProvider } from "@/components/study-flow/player/theme-provider";
import { BrandingProvider } from "@/components/study-flow/player/branding-provider";
import { StudyBackgroundShell } from "@/components/study-flow/player/study-background-layer";
import { KeyboardShortcutHint } from "@/components/ui/keyboard-shortcut-hint";
import { StudyTranslationsProvider } from "@/i18n";
import type { SupportedLocale } from "@/i18n/config";
import type { BrandingSettings } from "@/components/builders/shared/types";
import type { StudyFlowSettings } from "@veritio/study-types/study-flow-types";
import type { StudyMeta } from "@/stores/study-flow-player";

export interface SsrWelcomeData {
  welcome: StudyFlowSettings["welcome"];
  studyMeta: StudyMeta;
  branding: BrandingSettings | null;
  /** Sanitized server-side with isomorphic-dompurify */
  sanitizedPurpose: string;
  sanitizedRequirements: string;
  sanitizedMessage: string;
  incentiveMessage: string | null;
}

/**
 * Server-renderable welcome card. This is what participants see in the SSR
 * HTML (and pre-hydration) instead of a skeleton — the study title, welcome
 * message, and branding paint before any JavaScript loads. It is swapped for
 * the interactive store-driven player once the store has initialized; markup
 * parity with WelcomeStep (both render WelcomeContent) keeps the swap
 * pixel-stable. The Get Started button becomes interactive after the swap.
 */
export function StaticWelcome({
  data,
  locale,
  messages,
}: {
  data: SsrWelcomeData;
  locale: SupportedLocale;
  messages: Record<string, unknown>;
}) {
  return (
    <StudyTranslationsProvider locale={locale} messages={messages}>
      <ThemeProvider themeMode={data.branding?.themeMode}>
        <BrandingProvider branding={data.branding}>
          <StudyBackgroundShell branding={data.branding}>
            <div
              className="min-h-dvh flex flex-col text-foreground overflow-x-hidden"
              style={{ backgroundColor: "var(--style-page-bg)" }}
            >
              <AnimationStyles />
              <div className="flex-1 flex flex-col min-h-0">
                <WelcomeContent
                  welcome={data.welcome}
                  studyMeta={data.studyMeta}
                  branding={data.branding}
                  sanitizedPurpose={data.sanitizedPurpose}
                  sanitizedRequirements={data.sanitizedRequirements}
                  sanitizedMessage={data.sanitizedMessage}
                  incentiveMessage={data.incentiveMessage}
                  animate
                  actions={<StaticWelcomeActions />}
                />
              </div>
            </div>
          </StudyBackgroundShell>
        </BrandingProvider>
      </ThemeProvider>
    </StudyTranslationsProvider>
  );
}

function StaticWelcomeActions() {
  const t = useTranslations();
  return (
    <FadeIn className="flex sm:justify-end" delay={0.4}>
      <ButtonBounce isActive={false}>
        <BrandedButton>
          {t("common.getStarted")}
          <KeyboardShortcutHint shortcut="enter" variant="dark" />
        </BrandedButton>
      </ButtonBounce>
    </FadeIn>
  );
}
