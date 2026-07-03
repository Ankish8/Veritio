"use client";

import { useMemo } from "react";
import Link from "next/link";
import { FlaskConical } from "lucide-react";

import { Header } from "@/components/dashboard/header";
import { StudiesTableSkeleton } from "@/components/dashboard/skeletons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { NewStudyDropdown } from "@/components/dashboard/new-study-dropdown";
import {
  StudiesTable,
  type StudyWithCount as TableStudyWithCount,
} from "@/components/dashboard/studies-table";
import { usePaginatedStudies, type StudyWithCount } from "@/hooks/use-studies";
import { ParticipantsPagination } from "@/components/panel/participants/participants-pagination";
import { useProject } from "@/hooks/use-projects";
import type { ProjectWithStudyCount } from "@/lib/data/projects";
import type { StudyWithCount as ServerStudyWithCount } from "@/lib/data/studies";
import { useCurrentOrganization } from "@/hooks/use-organizations";
import { calculatePermissions } from "@/lib/supabase/collaboration-types";
import type { OrganizationRole } from "@/lib/supabase/collaboration-types";

interface ProjectDetailClientProps {
  projectId: string;
  initialProject?: ProjectWithStudyCount | null;
  initialStudies?: ServerStudyWithCount[];
  initialHasMore?: boolean;
}

export function ProjectDetailClient({
  projectId,
  initialProject,
  initialStudies,
  initialHasMore,
}: ProjectDetailClientProps) {
  const { currentOrg } = useCurrentOrganization();
  const permissions = useMemo(
    () =>
      calculatePermissions(
        (currentOrg?.user_role || "viewer") as OrganizationRole,
      ),
    [currentOrg?.user_role],
  );

  // SWR client-side fetch as fallback when server-side auth fails (Better Auth cookie issue)
  const { project: swrProject, isLoading: projectLoading } = useProject(
    projectId,
    initialProject ?? undefined,
  );

  // Paginated studies — loads 10 at a time from server
  const {
    studies,
    isLoading: studiesLoading,
    refetch,
    pagination,
  } = usePaginatedStudies(
    projectId,
    initialStudies
      ? {
          initialData: initialStudies as unknown as StudyWithCount[],
          initialHasMore,
        }
      : undefined,
  );

  // Prefer server-fetched data, fall back to SWR client-side fetch
  const project = initialProject ?? swrProject;

  // Show loading state while client-side SWR is fetching (server-side auth failed)
  if (!project && projectLoading) {
    return (
      <>
        <Header title="Loading..." />
        <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
          <StudiesTableSkeleton />
        </div>
      </>
    );
  }

  // Only show not-found after both server and client fetches have resolved
  if (!project) {
    return (
      <>
        <Header title="Project Not Found" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center sm:p-6">
          <p className="text-muted-foreground">
            This project doesn&apos;t exist or you don&apos;t have access.
          </p>
          <Button asChild>
            <Link href="/projects">Back to Projects</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title={project.name}>
        {permissions.canCreate && <NewStudyDropdown projectId={projectId} />}
      </Header>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6">
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
              className="px-4 pb-4 sm:px-6"
            />
          </div>
        )}
      </div>
    </>
  );
}
