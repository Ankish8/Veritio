import { Suspense } from 'react'
import { unstable_cache } from 'next/cache'
import { StudyPlayerClient } from './study-player-client'
import { createClient } from '@/lib/supabase/server'
import { getStudyByShareCode } from '@/services/participant/study-access'
import { loadMessages, normalizeLocale } from '@/i18n'
import { applyStoredTranslations, type TranslatedContent } from '@/lib/translation/store-translations'
import type { ParticipantStudyData, PasswordRequiredResponse } from '@/hooks/use-participant-study'
import type { IncentiveDisplayConfig } from '@/lib/utils/format-incentive'
import { generateBrandPalette } from '@/lib/brand-colors'
import { getPresetCSSVariables } from '@/lib/style-presets'
import type { BrandingSettings, StylePresetId, RadiusOption } from '@/components/builders/shared/types'

/**
 * Generate initial brand CSS for server-side injection.
 * Prevents FOUC when content renders before BrandingProvider's useEffect fires.
 */
function generateInitialBrandCSS(branding: BrandingSettings | null | undefined): string | null {
  const primaryColor = branding?.primaryColor
  if (!primaryColor || !/^#[0-9a-fA-F]{3,8}$/.test(primaryColor)) return null

  const palette = generateBrandPalette(primaryColor)
  const styleVars = getPresetCSSVariables(
    (branding?.stylePreset as StylePresetId) || 'default',
    (branding?.radiusOption as RadiusOption) || 'default',
  )

  const varLines = [
    `--brand: ${palette.brand}`,
    `--brand-hover: ${palette.brandHover}`,
    `--brand-muted: ${palette.brandMuted}`,
    `--brand-light: ${palette.brandLight}`,
    `--brand-subtle: ${palette.brandSubtle}`,
    `--brand-foreground: ${palette.brandForeground}`,
    ...Object.entries(styleVars).map(([k, v]) => `${k}: ${v}`),
  ]

  return `:root { ${varLines.join('; ')} }`
}

export const dynamic = 'force-dynamic'

/**
 * Cache public (non-password, non-preview) study data for 30 seconds.
 * Eliminates the Supabase round-trip on every participant page load for the same study.
 * Password-protected and preview fetches bypass the cache and always hit the DB.
 */
const fetchPublicStudy = unstable_cache(
  async (studyCode: string) => {
    const supabase = await createClient()
    return getStudyByShareCode(supabase, studyCode, undefined, false)
  },
  ['participant-public-study'],
  { revalidate: 30 }
)

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
  )
}

interface ParticipantStudyPageProps {
  params: Promise<{ studyCode: string }>
  searchParams: Promise<{ preview?: string; password?: string }>
}

async function StudyDataFetcher({
  studyCode,
  isPreview,
  password,
}: {
  studyCode: string
  isPreview: boolean
  password?: string
}) {
  // Use cached fetch for public studies (no password, not preview) to avoid a Supabase
  // round-trip on every page load. Password-protected and preview requests always hit the DB.
  const result = (!password && !isPreview)
    ? await fetchPublicStudy(studyCode)
    : await getStudyByShareCode(await createClient(), studyCode, password, isPreview)

  let initialStudy: ParticipantStudyData | null = null
  let initialPasswordRequired: PasswordRequiredResponse | null = null
  let initialError: string | null = null
  let studyLanguage: string | null = null
  let incentiveConfig: IncentiveDisplayConfig | null = null

  if (result.error) {
    initialError = result.error.message
  } else if (result.data) {
    if ('password_required' in result.data && result.data.password_required) {
      initialPasswordRequired = {
        password_required: true,
        study_id: result.data.study_id,
        title: result.data.title,
        branding: (result.data.branding || null) as any,
      }
    } else {
      const studyData = result.data as any
      studyLanguage = studyData.language || null
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
      }

      const incentiveData = (studyData as any).incentive_config
      if (incentiveData?.enabled && incentiveData?.amount) {
        incentiveConfig = {
          enabled: incentiveData.enabled,
          amount: incentiveData.amount,
          currency: incentiveData.currency as IncentiveDisplayConfig['currency'],
          incentive_type: incentiveData.incentive_type as IncentiveDisplayConfig['incentive_type'],
          description: incentiveData.description,
        }
      }
    }
  }

  const locale = normalizeLocale(studyLanguage)
  const messages = await loadMessages(locale)

  if (initialStudy && locale !== 'en-US') {
    const settings = initialStudy.settings as any
    const storedTranslations = settings?.translations as Record<string, TranslatedContent> | undefined

    if (storedTranslations?.[locale]) {
      applyStoredTranslations(initialStudy, storedTranslations, locale)
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
      : null

  // Inject brand CSS server-side to prevent FOUC before BrandingProvider's useEffect fires.
  // BrandingProvider will later append its own <style> tag (overriding this one) after hydration.
  const brandingForCSS = (initialStudy?.branding || initialPasswordRequired?.branding) as BrandingSettings | null | undefined
  const initialBrandCSS = generateInitialBrandCSS(brandingForCSS)

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
      />
    </>
  )
}

export default async function ParticipantStudyPage({
  params,
  searchParams,
}: ParticipantStudyPageProps) {
  const { studyCode } = await params
  const { preview, password } = await searchParams
  const isPreview = preview === 'true'

  return (
    <Suspense fallback={<StudySkeleton />}>
      <StudyDataFetcher
        studyCode={studyCode}
        isPreview={isPreview}
        password={password}
      />
    </Suspense>
  )
}
