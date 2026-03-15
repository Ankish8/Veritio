"use client"

import Link from "next/link"
import { AlertCircle, FlaskConical, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { StudiesTable, type StudyWithCount } from "@/components/dashboard/studies-table/studies-table"
import { useAllStudies, type AllStudiesResponse } from "@/hooks/use-all-studies"

/**
 * Global Studies page client component.
 *
 * Uses the shared StudiesTable component with `showProjectColumn` enabled
 * to display all studies across all projects.
 */
interface StudiesClientProps {
  initialData?: AllStudiesResponse
}

export function StudiesClient({ initialData }: StudiesClientProps = {}) {
  const { studies, isLoading, isValidating, error, refetch } = useAllStudies({}, {}, initialData)

  // Show skeleton during initial load OR when revalidating with no data
  // This prevents showing "No studies yet" while data is being fetched
  const showSkeleton = isLoading || (isValidating && studies.length === 0 && !error)

  // Transform the data to match StudyWithCount type
  // The hook returns StudyWithProject which is compatible but needs casting
  const studiesData: StudyWithCount[] = studies.map((study) => ({
    id: study.id,
    title: study.title,
    description: null, // Not returned by the all-studies endpoint
    study_type: study.study_type as StudyWithCount['study_type'],
    status: (study.status || 'draft') as StudyWithCount['status'],
    share_code: undefined, // Not needed for copy link in all-studies view
    participant_count: study.participant_count,
    created_at: study.created_at || new Date().toISOString(),
    updated_at: study.updated_at,
    launched_at: study.launched_at,
    project_id: study.project_id,
    project_name: study.project_name,
  }))

  if (showSkeleton) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // Show error state before empty state - critical for timeout/network errors
  if (error && studies.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="rounded-xl border border-dashed border-destructive/30 p-12 text-center bg-destructive/5">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive/60" />
          <h3 className="font-semibold text-foreground mt-4">Unable to load studies</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            {error}
          </p>
          <Button onClick={() => refetch()} variant="outline" className="mt-4 gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (studies.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <EmptyState
          icon={FlaskConical}
          title="No studies yet"
          description="Create your first study to get started with user research. Go to Projects to create a new study within a project."
          action={
            <Button asChild size="lg">
              <Link href="/projects">Go to Projects</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <StudiesTable
        studies={studiesData}
        showProjectColumn={true}
        onRefetch={refetch}
      />
    </div>
  )
}
