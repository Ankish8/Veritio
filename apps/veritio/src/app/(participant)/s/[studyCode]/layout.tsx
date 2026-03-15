import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

interface StudyBranding {
  logo?: { url: string; filename: string }
  socialImage?: { url: string; filename: string }
  primaryColor?: string
}

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ studyCode: string }>
}

// Fetch basic study metadata for Open Graph tags
async function getStudyMetadata(studyCode: string) {
  const supabase = await createClient()

  // Try share_code first, then url_slug
  let study = null

  const { data: byShareCode } = await supabase
    .from('studies')
    .select('title, description, branding')
    .eq('share_code', studyCode)
    .single()

  if (byShareCode) {
    study = byShareCode
  } else {
    const { data: bySlug } = await supabase
      .from('studies')
      .select('title, description, branding')
      .eq('url_slug', studyCode)
      .single()

    if (bySlug) {
      study = bySlug
    }
  }

  return study
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
