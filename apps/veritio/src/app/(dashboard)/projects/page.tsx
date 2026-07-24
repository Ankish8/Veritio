import { Suspense } from "react";
import { cookies } from "next/headers";
import { Header } from "@/components/dashboard/header";
import { ProjectGridSkeleton } from "@/components/dashboard/skeletons";
import { ProjectsServerData } from "./projects-server-data";

// Force dynamic rendering to ensure cookies are available for auth
export const dynamic = "force-dynamic";

/**
 * The route shell streams immediately; the first projects payload is fetched
 * server-side (same-region Supabase) and streamed behind Suspense, so the grid
 * renders with data instead of a skeleton + client round-trip.
 */
export default async function ProjectsPage() {
  const cookieStore = await cookies();
  const organizationId = cookieStore.get("veritio-active-org")?.value ?? null;

  return (
    <Suspense
      fallback={
        <>
          <Header title="Projects" />
          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
            <ProjectGridSkeleton count={6} />
          </div>
        </>
      }
    >
      <ProjectsServerData organizationId={organizationId} />
    </Suspense>
  );
}
