import "server-only";

import { getServerSession } from "@veritio/auth/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { listProjects } from "@/services/project-service";
import { ProjectsClient } from "./projects-client";
import type { ProjectWithCount } from "@/hooks/use-projects";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Streams the first projects payload in the SSR response so the grid renders
 * without a client round-trip. Mirrors the list-projects step handler
 * (auth → listProjects with the same args); listProjects enforces org
 * membership internally. Any failure falls back to the client-fetch path,
 * which is exactly today's behavior.
 */
export async function ProjectsServerData({
  organizationId,
}: {
  organizationId: string | null;
}) {
  const orgId =
    organizationId && UUID_RE.test(organizationId) ? organizationId : undefined;

  let initialData: ProjectWithCount[] | undefined;
  try {
    const session = await getServerSession();
    if (session?.user?.id) {
      const supabase = createServiceRoleClient();
      const { data } = await listProjects(supabase, session.user.id, {
        organizationId: orgId,
      });
      initialData = (data as unknown as ProjectWithCount[]) ?? undefined;
    }
  } catch {
    initialData = undefined;
  }

  return (
    <ProjectsClient
      initialData={initialData}
      initialOrganizationId={organizationId}
    />
  );
}
