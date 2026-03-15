'use client'

import { use, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'

import { Header } from '@/components/dashboard/header'
import { PreviewSkeleton } from '@/components/dashboard/skeletons'
import { Button } from '@/components/ui/button'
import { useStudy } from '@/hooks/use-studies'

interface PreviewPageProps {
  params: Promise<{ projectId: string; studyId: string }>
}

export default function PreviewPage({ params }: PreviewPageProps) {
  const { projectId, studyId } = use(params)
  const router = useRouter()
  const { study, isLoading: studyLoading, error: studyError } = useStudy(studyId)

  // Use a ref to track if we've already opened the preview (survives Strict Mode)
  const hasOpenedRef = useRef(false)

  // Auto-open preview in new tab when study data loads
  useEffect(() => {
    if (study?.share_code && !hasOpenedRef.current) {
      hasOpenedRef.current = true

      // Open in new tab
      const previewUrl = `/s/${study.share_code}?preview=true`
      window.open(previewUrl, '_blank')

      // Navigate back to builder
      router.push(`/projects/${projectId}/studies/${studyId}/builder`)
    }
    // Note: router excluded from deps - it's stable and including it can cause
    // "Router action dispatched before initialization" errors in Next.js 16
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study, projectId, studyId])

  if (studyLoading) {
    return <PreviewSkeleton />
  }

  if (studyError || !study) {
    return (
      <>
        <Header title="Study Not Found" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">This study doesn&apos;t exist or you don&apos;t have access.</p>
          <Button asChild>
            <Link href={`/projects/${projectId}`}>Back to Project</Link>
          </Button>
        </div>
      </>
    )
  }

  // Fallback UI if auto-open didn't work (e.g., popup blocked)
  return (
    <>
      <Header title={`Preview: ${study.title}`}>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/projects/${projectId}/studies/${studyId}/builder`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Builder
          </Link>
        </Button>
      </Header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Preview Ready</h2>
          <p className="text-muted-foreground mb-6">
            If the preview didn&apos;t open automatically, click the button below to open it in a new tab.
          </p>

          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              onClick={() => window.open(`/s/${study.share_code}?preview=true`, '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Preview in New Tab
            </Button>

            <Button
              variant="outline"
              asChild
            >
              <Link href={`/projects/${projectId}/studies/${studyId}/builder`}>
                Return to Builder
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
