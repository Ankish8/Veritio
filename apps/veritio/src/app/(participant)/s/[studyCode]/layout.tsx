import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'

interface StudyBranding {
  logo?: { url: string; filename: string }
  socialImage?: { url: string; filename: string }
  primaryColor?: string
}

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ studyCode: string }>
}

// Fetch basic study metadata for Open Graph tags. Cached for 60s to avoid a
// Supabase round-trip on every request; mirrors the fetchPublicStudy cache in
// the sibling page.tsx. The studyCode is passed as an argument so unstable_cache
// keys per code.
async function readStudyMetadata(studyCode: string) {
  const supabase = createServiceRoleClient()

  // Match either share_code or url_slug in a single query.
  const { data, error } = await supabase
    .from('studies')
    .select('title, description, branding')
    .or(`share_code.eq.${studyCode},url_slug.eq.${studyCode}`)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[participant-layout] study metadata lookup failed', {
      studyCode,
      error: error.message,
    })
  }

  return data
}

const getCachedStudyMetadata = unstable_cache(readStudyMetadata, ['participant-study-metadata'], {
  revalidate: 60,
})

/**
 * A cached miss must never turn a live study into "Study Not Found".
 *
 * unstable_cache stores whatever the function returns — including the null this
 * query produces when the database call fails — and that entry then lives in the
 * serving instance's memory for the whole revalidate window. One transient
 * Supabase error was enough to make a working participant link look dead.
 * Confirm a negative against the database before trusting it.
 */
async function getStudyMetadata(studyCode: string) {
  const cached = await getCachedStudyMetadata(studyCode)
  if (cached) return cached
  return readStudyMetadata(studyCode)
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { studyCode } = await params
  const study = await getStudyMetadata(studyCode)

  if (!study) {
    return {
      title: 'Study Not Found',
    }
  }

  const branding = study.branding as StudyBranding | null
  const socialImageUrl = branding?.socialImage?.url

  return {
    title: study.title,
    description: study.description || undefined,
    openGraph: {
      title: study.title,
      description: study.description || undefined,
      type: 'website',
      images: socialImageUrl
        ? [
            {
              url: socialImageUrl,
              width: 1200,
              height: 630,
              alt: study.title,
            },
          ]
        : [],
    },
    twitter: {
      card: socialImageUrl ? 'summary_large_image' : 'summary',
      title: study.title,
      description: study.description || undefined,
      images: socialImageUrl ? [socialImageUrl] : [],
    },
  }
}

export default function StudyLayout({ children }: LayoutProps) {
  return <>{children}</>
}
