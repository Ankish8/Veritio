import "./dashboard.css"
import { cookies } from "next/headers"
import { SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { FloatingActionBarIcons } from "@/components/analysis/shared/floating-action-bar"
import { DashboardProvidersComposition } from "@/components/providers/dashboard-providers-composition"
import { KeyboardShortcutsProvider } from "./keyboard-shortcuts-provider"
import { SidebarController } from "./sidebar-controller"
import { RealtimeDashboardBridge } from "./realtime-dashboard-bridge"
import { FloatingActionBarPanel, MobilePanelModal } from "./lazy-panels"
import { createServiceRoleClient } from "@/lib/supabase/server"
import type { RecentStudyLink } from "@/hooks/use-recent-studies"

async function prefetchSidebarFallback(): Promise<Record<string, unknown>> {
  try {
    const cookieStore = await cookies()
    const orgId = cookieStore.get('veritio-active-org')?.value
    if (!orgId) return {}

    const supabase = createServiceRoleClient()
    const { data: studies } = await supabase
      .from('studies')
      .select('id, title, project_id, study_type, status, updated_at')
      .eq('organization_id', orgId)
      .eq('is_archived', false)
      .order('last_opened_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(10)

    if (!studies?.length) return {}

    return {
      [`/api/sidebar/recent-studies?organizationId=${orgId}`]: {
        recentStudies: studies as RecentStudyLink[],
      },
    }
  } catch {
    return {}
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const swrFallback = await prefetchSidebarFallback()

  return (
    <DashboardProvidersComposition swrFallback={swrFallback}>
      <SidebarController />
      <RealtimeDashboardBridge />
      <AppSidebar />
      <SidebarInset className="bg-app-background min-h-screen overflow-x-hidden">
        <KeyboardShortcutsProvider>
          <div className="flex flex-col h-screen p-2 sm:p-3 overflow-hidden">
            {/* Content card - right margin (44px) aligns with fixed icon bar */}
            <div className="flex flex-1 overflow-hidden rounded-2xl bg-background shadow-lg dark:shadow-xl min-w-0 sm:mr-11">
              <div className="flex-1 flex flex-col overflow-y-auto min-w-0">
                {children}
              </div>
              <div className="hidden sm:block flex-shrink-0 overflow-hidden max-w-[560px]">
                <FloatingActionBarPanel />
              </div>
            </div>
          </div>

          <MobilePanelModal />

          {/* Fixed icon bar outside the content card */}
          <div className="hidden sm:flex fixed right-1 top-0 bottom-0 w-12 items-start justify-center pt-[18px] z-[100] pointer-events-auto">
            <FloatingActionBarIcons />
          </div>
        </KeyboardShortcutsProvider>
      </SidebarInset>
    </DashboardProvidersComposition>
  )
}
