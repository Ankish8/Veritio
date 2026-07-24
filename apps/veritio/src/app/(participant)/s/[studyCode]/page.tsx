import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { StudyPlayerClient } from "./study-player-client";
import type { SsrWelcomeData } from "./static-welcome";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getStudyByShareCode } from "@/services/participant/study-access";
import { loadMessages, normalizeLocale } from "@/i18n";
import {
  applyStoredTranslations,
  type TranslatedContent,
} from "@/lib/translation/store-translations";
import type {
  ParticipantStudyData,
  PasswordRequiredResponse,
} from "@/hooks/use-participant-study";
import {
  replaceIncentivePlaceholder,
  shouldShowIncentive,
  type IncentiveDisplayConfig,
} from "@/lib/utils/format-incentive";
import { migrateToStudyFlowSettings } from "@/lib/study-flow/defaults";
import { determineStartStep } from "@/stores/study-flow-player/navigation";
import type { StudyFlowSettings } from "@veritio/study-types/study-flow-types";
import { generateBrandPalette } from "@/lib/brand-colors";
import { getPresetCSSVariables } from "@/lib/style-presets";
import type {
  BrandingSettings,
  StylePresetId,
  RadiusOption,
} from "@/components/builders/shared/types";

/**
 * Generate initial brand CSS for server-side injection.
 * Prevents FOUC when content renders before BrandingProvider's useEffect fires.
 * Always emits the style-preset variables (--style-card-bg etc.) — the SSR
 * welcome card depends on them even when no brand color is configured.
 */
function generateInitialBrandCSS(
  branding: BrandingSettings | null | undefined,
): string {
  const styleVars = getPresetCSSVariables(
    (branding?.stylePreset as StylePresetId) || "default",
    (branding?.radiusOption as RadiusOption) || "default",
  );

  const varLines = Object.entries(styleVars).map(([k, v]) => `${k}: ${v}`);

  const primaryColor = branding?.primaryColor;
  if (primaryColor && /^#[0-9a-fA-F]{3,8}$/.test(primaryColor)) {
    const palette = generateBrandPalette(primaryColor);
    varLines.unshift(
      `--brand: ${palette.brand}`,
      `--brand-hover: ${palette.brandHover}`,
      `--brand-muted: ${palette.brandMuted}`,
      `--brand-light: ${palette.brandLight}`,
      `--brand-subtle: ${palette.brandSubtle}`,
      `--brand-foreground: ${palette.brandForeground}`,
    );
  }

  return `:root { ${varLines.join("; ")} }`;
}

/**
 * Server-side sanitizer for researcher-authored rich text, approximating the
 * client-side DOMPurify defaults (the mounted WelcomeStep re-sanitizes the raw
 * values with DOMPurify, so the two outputs must agree for typical TipTap
 * content: headings, lists, links, emphasis, images).
 */
// Lazily constructed so a sanitizer-load failure degrades to skeleton rendering
// (buildSsrWelcome is fail-open) instead of 500ing the participant route. `xss`
// is pure CJS end-to-end — no jsdom (breaks under Bun dev) and no CJS→ESM
// require chains (sanitize-html 500ed on the Node lambda with ERR_REQUIRE_ESM).
let xssFilter: import("xss").FilterXSS | null = null;

async function sanitizeWelcomeHtml(html: string): Promise<string> {
  if (!xssFilter) {
    const { FilterXSS, getDefaultWhiteList } = await import("xss");
    const whiteList = getDefaultWhiteList();
    // TipTap-authored rich text: allow style/class broadly (DOMPurify on the
    // client allows them too, keeping the SSR card and hydrated card in sync)
    for (const tag of Object.keys(whiteList)) {
      whiteList[tag] = [...(whiteList[tag] || []), "style", "class"];
    }
    whiteList.a = ["href", "target", "rel", "title", "style", "class"];
    whiteList.img = ["src", "alt", "width", "height", "style", "class"];
    whiteList.span = ["style", "class"];
    xssFilter = new FilterXSS({
      whiteList,
      stripIgnoreTag: true,
      stripIgnoreTagBody: ["script", "style"],
    });
  }
  return xssFilter.process(html);
}

/**
 * Build the server-rendered welcome card data. Returns null when the
 * participant will not start on the welcome step (welcome disabled, resume
 * link, preview mode) — those flows keep the skeleton-until-hydration path.
 */
async function buildSsrWelcome(
  study: ParticipantStudyData,
  incentiveConfig: IncentiveDisplayConfig | null,
  isWidgetParticipant: boolean,
): Promise<SsrWelcomeData | null> {
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
    study.study_type as Parameters<typeof migrateToStudyFlowSettings>[3],
  );

  const startStep = determineStartStep(
    flowSettings,
    study.study_type as Parameters<typeof determineStartStep>[1],
    study.screening_questions || [],
    study.pre_study_questions || [],
    study.survey_questions || [],
  );
  if (startStep !== "welcome") return null;

  // Mirrors WelcomeStep's incentive logic (incentives are widget-exclusive)
  const effectiveIncentive = isWidgetParticipant ? incentiveConfig : null;
  const displayIncentive =
    flowSettings.welcome.showIncentive &&
    shouldShowIncentive(effectiveIncentive);
  const rawIncentiveMessage =
    flowSettings.welcome.incentiveMessage ||
    "Complete this study and receive {incentive}";
  const incentiveMessage = displayIncentive
    ? replaceIncentivePlaceholder(rawIncentiveMessage, effectiveIncentive)
    : null;

  return {
    welcome: flowSettings.welcome,
    studyMeta: {
      title: study.title,
      description: study.description || null,
      purpose: study.purpose || null,
      participantRequirements: study.participant_requirements || null,
    },
    branding: (study.branding || null) as BrandingSettings | null,
    sanitizedPurpose: study.purpose
      ? await sanitizeWelcomeHtml(study.purpose)
      : "",
    sanitizedRequirements: study.participant_requirements
      ? await sanitizeWelcomeHtml(study.participant_requirements)
      : "",
    sanitizedMessage: flowSettings.welcome.message
      ? await sanitizeWelcomeHtml(flowSettings.welcome.message)
      : "",
    incentiveMessage,
  };
}

export const dynamic = "force-dynamic";

/**
 * Cache public (non-password, non-preview) study data for 30 seconds.
 * Eliminates the Supabase round-trip on every participant page load for the same study.
 * Password-protected and preview fetches bypass the cache and always hit the DB.
 */
const fetchPublicStudy = unstable_cache(
  async (studyCode: string) => {
    const supabase = createServiceRoleClient();
    return getStudyByShareCode(supabase, studyCode, undefined, false);
  },
  ["participant-public-study"],
  { revalidate: 30 },
);

function StudySkeleton() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Skeleton welcome card */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-sm border p-8 space-y-6 animate-pulse">
            {/* Title skeleton */}
            <div className="h-8 bg-stone-200 rounded-lg w-3/4 mx-auto" />

            {/* Description skeleton */}
            <div className="space-y-3">
              <div className="h-4 bg-stone-100 rounded w-full" />
              <div className="h-4 bg-stone-100 rounded w-5/6" />
              <div className="h-4 bg-stone-100 rounded w-4/6" />
            </div>

            {/* Button skeleton */}
            <div className="flex justify-end pt-4">
              <div className="h-10 bg-stone-200 rounded-lg w-32" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ParticipantStudyPageProps {
  params: Promise<{ studyCode: string }>;
  searchParams: Promise<{
    preview?: string;
    password?: string;
    resume?: string;
    [key: string]: string | string[] | undefined;
  }>;
}

async function StudyDataFetcher({
  studyCode,
  isPreview,
  password,
  hasResumeToken,
  isWidgetParticipant,
}: {
  studyCode: string;
  isPreview: boolean;
  password?: string;
  hasResumeToken: boolean;
  isWidgetParticipant: boolean;
}) {
  // Use cached fetch for public studies (no password, not preview) to avoid a Supabase
  // round-trip on every page load. Password-protected and preview requests always hit the DB.
  const result =
    !password && !isPreview
      ? await fetchPublicStudy(studyCode)
      : await getStudyByShareCode(
          createServiceRoleClient(),
          studyCode,
          password,
          isPreview,
        );

  let initialStudy: ParticipantStudyData | null = null;
  let initialPasswordRequired: PasswordRequiredResponse | null = null;
  let initialError: string | null = null;
  let studyLanguage: string | null = null;
  let incentiveConfig: IncentiveDisplayConfig | null = null;

  if (result.error) {
    initialError = result.error.message;
  } else if (result.data) {
    if ("password_required" in result.data && result.data.password_required) {
      initialPasswordRequired = {
        password_required: true,
        study_id: result.data.study_id,
        title: result.data.title,
        branding: (result.data.branding || null) as any,
      };
    } else {
      const studyData = result.data as any;
      studyLanguage = studyData.language || null;
      initialStudy = {
        ...studyData,
        branding: studyData.branding || null,
        cards: studyData.cards || [],
        categories: studyData.categories || [],
        tree_nodes: studyData.tree_nodes || [],
        tasks: studyData.tasks || [],
        screening_questions: studyData.screening_questions || [],
        pre_study_questions: studyData.pre_study_questions || [],
        post_study_questions: studyData.post_study_questions || [],
        survey_questions: studyData.survey_questions || [],
        survey_rules: studyData.survey_rules || [],
      };

      const incentiveData = (studyData as any).incentive_config;
      if (incentiveData?.enabled && incentiveData?.amount) {
        incentiveConfig = {
          enabled: incentiveData.enabled,
          amount: incentiveData.amount,
          currency:
            incentiveData.currency as IncentiveDisplayConfig["currency"],
          incentive_type:
            incentiveData.incentive_type as IncentiveDisplayConfig["incentive_type"],
          description: incentiveData.description,
        };
      }
    }
  }

  const locale = normalizeLocale(studyLanguage);
  const messages = await loadMessages(locale);

  if (initialStudy && locale !== "en-US") {
    const settings = initialStudy.settings as any;
    const storedTranslations = settings?.translations as
      Record<string, TranslatedContent> | undefined;

    if (storedTranslations?.[locale]) {
      applyStoredTranslations(initialStudy, storedTranslations, locale);
    }
    // If no stored translation exists, serve original content.
    // Real-time inline translation is a blocking LLM call (5-15s) that degrades every
    // participant's experience. Pre-translation should run as a background job when
    // the study is launched (see: TODO in study launch service).
  }

  // Preload branding logo to start fetch during HTML parsing (saves 1-3s on LCP)
  const logoUrl = initialStudy?.branding
    ? (initialStudy.branding as any)?.logo?.url
    : initialPasswordRequired?.branding
      ? (initialPasswordRequired.branding as any)?.logo?.url
      : null;

  // Inject brand CSS server-side to prevent FOUC before BrandingProvider's useEffect fires.
  // BrandingProvider will later append its own <style> tag (overriding this one) after hydration.
  const brandingForCSS = (initialStudy?.branding ||
    initialPasswordRequired?.branding) as BrandingSettings | null | undefined;
  const initialBrandCSS = generateInitialBrandCSS(brandingForCSS);

  // Server-render the welcome card so participants see study content before any
  // JS loads. Skipped for resume links (progress restoration moves the step) and
  // preview mode (preview resets the store on mount). FAIL-OPEN: any error here
  // (sanitizer load, malformed settings, …) must degrade to the pre-SSR skeleton
  // behavior — it must never 500 the participant route.
  let ssrWelcome: SsrWelcomeData | null = null;
  if (initialStudy && !isPreview && !hasResumeToken) {
    try {
      ssrWelcome = await buildSsrWelcome(
        initialStudy,
        incentiveConfig,
        isWidgetParticipant,
      );
    } catch (err) {
      console.error("[participant] ssr welcome disabled for this render:", err);
      ssrWelcome = null;
    }
  }

  return (
    <>
      {initialBrandCSS && (
        <style dangerouslySetInnerHTML={{ __html: initialBrandCSS }} />
      )}
      {logoUrl && (
        <link rel="preload" href={logoUrl} as="image" fetchPriority="high" />
      )}
      <StudyPlayerClient
        studyCode={studyCode}
        initialStudy={initialStudy}
        initialPasswordRequired={initialPasswordRequired}
        initialError={initialError}
        isPreviewMode={isPreview}
        locale={locale}
        messages={messages}
        incentiveConfig={incentiveConfig}
        ssrWelcome={ssrWelcome}
      />
    </>
  );
}

export default async function ParticipantStudyPage({
  params,
  searchParams,
}: ParticipantStudyPageProps) {
  const { studyCode } = await params;
  const sp = await searchParams;
  const { preview, password, resume } = sp;
  const isPreview = preview === "true";
  // Incentives are widget-exclusive — mirror useStudyPlayer's URL-tag detection
  const isWidgetParticipant =
    sp["utm_source"] === "widget" || !!sp["embed-code-id"];

  return (
    <Suspense fallback={<StudySkeleton />}>
      <StudyDataFetcher
        studyCode={studyCode}
        isPreview={isPreview}
        password={typeof password === "string" ? password : undefined}
        hasResumeToken={typeof resume === "string" && resume.length > 0}
        isWidgetParticipant={isWidgetParticipant}
      />
    </Suspense>
  );
}
