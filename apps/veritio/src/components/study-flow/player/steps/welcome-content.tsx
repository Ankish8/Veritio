"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Gift } from "lucide-react";
import { FadeIn } from "../css-animations";
import { StepLayout } from "../step-layout";
import { RichContent } from "../rich-content";
import type { BrandingSettings } from "@/components/builders/shared/types";
import type { StudyFlowSettings } from "@veritio/study-types/study-flow-types";
import type { StudyMeta } from "@/stores/study-flow-player";

export interface WelcomeContentProps {
  welcome: StudyFlowSettings["welcome"];
  studyMeta: StudyMeta | null;
  /** Pre-sanitized HTML (DOMPurify client-side, isomorphic-dompurify server-side) */
  sanitizedPurpose: string;
  sanitizedRequirements: string;
  sanitizedMessage: string;
  /** Resolved incentive message (placeholder already replaced), or null to hide */
  incentiveMessage: string | null;
  /** false suppresses entrance animations (used when the SSR welcome already played them) */
  animate?: boolean;
  /** Branding override for StepLayout when the player store is not initialized yet */
  branding?: BrandingSettings | null;
  actions?: ReactNode;
}

/**
 * Presentational body of the welcome step. Rendered by WelcomeStep
 * (store-driven, after hydration) and StaticWelcome (server-rendered from
 * page props). Both must produce identical markup so the post-hydration
 * swap is pixel-stable.
 */
export function WelcomeContent({
  welcome,
  studyMeta,
  sanitizedPurpose,
  sanitizedRequirements,
  sanitizedMessage,
  incentiveMessage,
  animate = true,
  branding,
  actions,
}: WelcomeContentProps) {
  const t = useTranslations();

  const {
    title,
    includeStudyTitle,
    includeDescription,
    includePurpose,
    includeParticipantRequirements,
  } = welcome;

  // Check which info blocks should be shown (toggle enabled AND value exists)
  const showStudyTitle = includeStudyTitle && studyMeta?.title;
  const showDescription = includeDescription && studyMeta?.description;
  const showPurpose = includePurpose && sanitizedPurpose;
  const showRequirements =
    includeParticipantRequirements && sanitizedRequirements;

  const hasStudyInfo = showStudyTitle || showDescription;
  const hasDetailedInfo = showPurpose || showRequirements;

  // duration 0 with fill-mode `both` jumps straight to the settled state
  const dur = animate ? undefined : 0;
  const d = (delay: number) => (animate ? delay : 0);

  return (
    <StepLayout title={title} branding={branding} actions={actions}>
      {/* Study Title & Description - prominent, no box */}
      {hasStudyInfo && (
        <FadeIn className="mb-8" duration={dur}>
          {showStudyTitle && (
            <h2
              className="text-2xl font-semibold mb-3 tracking-tight leading-tight"
              style={{ color: "var(--style-text-primary)" }}
            >
              {studyMeta!.title}
            </h2>
          )}
          {showDescription && (
            <p
              className="text-base leading-relaxed"
              style={{ color: "var(--style-text-secondary)" }}
            >
              {studyMeta!.description}
            </p>
          )}
        </FadeIn>
      )}

      {/* Purpose & Requirements - subtle info cards */}
      {hasDetailedInfo && (
        <div className="space-y-4 mb-8">
          {showPurpose && (
            <FadeIn
              className="group rounded-xl px-5 py-4 transition-all duration-300"
              style={{
                backgroundColor: "var(--style-bg-muted)",
                border: "1px solid var(--style-border-muted)",
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.02)",
              }}
              delay={d(0.1)}
              duration={dur}
              hoverLift
            >
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-2.5 opacity-70"
                style={{ color: "var(--style-text-muted)" }}
              >
                {t("welcome.purpose")}
              </p>
              <div
                className="text-sm max-w-none leading-relaxed
                  [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul]:ml-0
                  [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_ol]:ml-0
                  [&_li]:my-1 [&_li]:pl-0.5
                  [&_p]:leading-relaxed [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
                style={{ color: "var(--style-text-secondary)" }}
                dangerouslySetInnerHTML={{ __html: sanitizedPurpose }}
              />
            </FadeIn>
          )}
          {showRequirements && (
            <FadeIn
              className="group rounded-xl px-5 py-4 transition-all duration-300"
              style={{
                backgroundColor: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(217,119,6,0.2)",
                boxShadow: "0 1px 3px 0 rgba(251,191,36,0.05)",
              }}
              delay={d(0.2)}
              duration={dur}
              hoverLift
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-2.5 text-amber-600 dark:text-amber-400 opacity-90">
                {t("welcome.whoShouldParticipate")}
              </p>
              <div
                className="text-sm max-w-none leading-relaxed
                  [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul]:ml-0
                  [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_ol]:ml-0
                  [&_li]:my-1 [&_li]:pl-0.5
                  [&_p]:leading-relaxed [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
                style={{ color: "var(--style-text-secondary)" }}
                dangerouslySetInnerHTML={{ __html: sanitizedRequirements }}
              />
            </FadeIn>
          )}
        </div>
      )}

      {/* Incentive Card - shown when enabled in flow settings and incentive is configured */}
      {incentiveMessage && (
        <FadeIn
          className="rounded-xl px-5 py-4 mb-8 flex items-center gap-3.5 transition-all duration-300"
          style={{
            backgroundColor: "rgba(34, 197, 94, 0.08)",
            border: "1px solid rgba(22, 163, 74, 0.2)",
            boxShadow: "0 1px 3px 0 rgba(34, 197, 94, 0.05)",
          }}
          delay={d(0.3)}
          duration={dur}
          hoverLift
        >
          <Gift
            className="h-5 w-5 flex-shrink-0"
            style={{ color: "rgb(22, 163, 74)" }}
          />
          <p
            className="text-sm font-medium"
            style={{ color: "var(--style-text-primary)" }}
          >
            {incentiveMessage}
          </p>
        </FadeIn>
      )}

      {/* Main welcome message */}
      <FadeIn delay={d(0.35)} duration={dur} direction="none">
        <RichContent html={sanitizedMessage} preSanitized />
      </FadeIn>
    </StepLayout>
  );
}
