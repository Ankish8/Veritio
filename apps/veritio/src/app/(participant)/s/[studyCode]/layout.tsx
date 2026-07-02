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
const getStudyMetadata = unstable_cache(
  async (studyCode: string) => {
    const supabase = createServiceRoleClient()

    // Match either share_code or url_slug in a single query.
    const { data } = await supabase
      .from('studies')
      .select('title, description, branding')
      .or(`share_code.eq.${studyCode},url_slug.eq.${studyCode}`)
      .limit(1)
      .maybeSingle()

    return data
  },
  ['participant-study-metadata'],
  { revalidate: 60 }
)

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
