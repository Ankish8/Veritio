'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Layers3, GitBranch, ClipboardList, Frame, MousePointerClick, Eye, Globe, FlaskConical } from 'lucide-react'

import { Header } from '@/components/dashboard/header'
import { StudiesTableSkeleton } from '@/components/dashboard/skeletons'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { CreateStudyDialog } from '@/components/dashboard/create-study-dialog'
import {
  StudiesTable,
  type StudyWithCount as TableStudyWithCount,
} from '@/components/dashboard/studies-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePaginatedStudies, type StudyWithCount } from '@/hooks/use-studies'
import { ParticipantsPagination } from '@/components/panel/participants/participants-pagination'
import { useProject } from '@/hooks/use-projects'
import type { ProjectWithStudyCount } from '@/lib/data/projects'
import type { StudyWithCount as ServerStudyWithCount } from '@/lib/data/studies'
import { useCurrentOrganization } from '@/hooks/use-organizations'
import { calculatePermissions } from '@/lib/supabase/collaboration-types'
import type { OrganizationRole } from '@/lib/supabase/collaboration-types'

interface ProjectDetailClientProps {
  projectId: string
  initialProject: ProjectWithStudyCount | null
  initialStudies: ServerStudyWithCount[]
  initialHasMore?: boolean
}

export function ProjectDetailClient({
  projectId,
  initialProject,
  initialStudies,
  initialHasMore,
}: ProjectDetailClientProps) {
  const router = useRouter()

  const { currentOrg } = useCurrentOrganization()
  const permissions = useMemo(
    () => calculatePermissions((currentOrg?.user_role || 'viewer') as OrganizationRole),
    [currentOrg?.user_role]
  )

  // SWR client-side fetch as fallback when server-side auth fails (Better Auth cookie issue)
  const { project: swrProject, isLoading: projectLoading } = useProject(
    projectId,
    initialProject ?? undefined
  )

  // Paginated studies — loads 10 at a time from server
  const { studies, isLoading: studiesLoading, createStudy, refetch, pagination } = usePaginatedStudies(
    projectId,
    {
      initialData: initialStudies as unknown as StudyWithCount[],
      initialHasMore,
    }
  )

  const handleStudyCreated = (study: { id: string }) => {
    router.push(`/projects/${projectId}/studies/${study.id}/builder`)
  }

  // Prefer server-fetched data, fall back to SWR client-side fetch
  const project = initialProject ?? swrProject

  // Show loading state while client-side SWR is fetching (server-side auth failed)
  if (!project && projectLoading) {
    return (
      <>
        <Header title="Loading..." />
        <div className="flex flex-1 flex-col gap-6 p-6">
          <StudiesTableSkeleton />
        </div>
      </>
    )
  }

  // Only show not-found after both server and client fetches have resolved
  if (!project) {
    return (
      <>
        <Header title="Project Not Found" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">This project doesn&apos;t exist or you don&apos;t have access.</p>
          <Button asChild>
            <Link href="/projects">Back to Projects</Link>
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={project.name}>
        {permissions.canCreate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Study
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <CreateStudyDialog
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Layers3 className="mr-2 h-4 w-4" />
                    Card Sorting
                  </DropdownMenuItem>
                }
                defaultType="card_sort"
                createStudy={createStudy}
                onSuccess={handleStudyCreated}
              />
              <CreateStudyDialog
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <GitBranch className="mr-2 h-4 w-4" />
                    Tree Testing
                  </DropdownMenuItem>
                }
                defaultType="tree_test"
                createStudy={createStudy}
                onSuccess={handleStudyCreated}
              />
              <CreateStudyDialog
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Survey
                  </DropdownMenuItem>
                }
                defaultType="survey"
                createStudy={createStudy}
                onSuccess={handleStudyCreated}
              />
              <CreateStudyDialog
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Frame className="mr-2 h-4 w-4" />
                    Prototype Testing
                  </DropdownMenuItem>
                }
                defaultType="prototype_test"
                createStudy={createStudy}
                onSuccess={handleStudyCreated}
              />
              <CreateStudyDialog
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <MousePointerClick className="mr-2 h-4 w-4" />
                    First Click Testing
                  </DropdownMenuItem>
                }
                defaultType="first_click"
                createStudy={createStudy}
                onSuccess={handleStudyCreated}
              />
              <CreateStudyDialog
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Eye className="mr-2 h-4 w-4" />
                    First Impression Test
                  </DropdownMenuItem>
                }
                defaultType="first_impression"
                createStudy={createStudy}
                onSuccess={handleStudyCreated}
              />
              <CreateStudyDialog
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Globe className="mr-2 h-4 w-4" />
                    Live Website Test
                  </DropdownMenuItem>
                }
                defaultType="live_website_test"
                createStudy={createStudy}
                onSuccess={handleStudyCreated}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </Header>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}

          {/* Show skeleton on initial load (no server data) OR during pagination page changes */}
          {studiesLoading ? (
            <StudiesTableSkeleton />
          ) : studies.length === 0 && pagination.page === 1 ? (
            <EmptyState
              icon={FlaskConical}
              title="No studies yet"
              description="Click New Study above to run your first UX research study. You can create card sorts, tree tests, surveys, and more."
            />
          ) : (
            <StudiesTable
              studies={studies as TableStudyWithCount[]}
              projectId={projectId}
              onRefetch={refetch}
            />
          )}
        </div>

        {((pagination.total ?? 0) > 10 || pagination.hasPrevPage) && (
          <div className="sticky bottom-0 bg-background">
            <ParticipantsPagination
              page={pagination.page}
              limit={10}
              total={pagination.total ?? 0}
              hasMore={pagination.hasNextPage}
              onPageChange={(newPage) =>
                newPage > pagination.page
                  ? pagination.onNextPage()
                  : pagination.onPrevPage()
              }
              onPageSizeChange={() => {}}
              className="px-6 pb-4"
            />
          </div>
        )}
      </div>
    </>
  )
}
