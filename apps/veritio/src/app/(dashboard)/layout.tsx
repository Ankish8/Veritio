import "./dashboard.css"
import { redirect } from "next/navigation"
import { getServerSession } from "@veritio/auth/server"
import { SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { FloatingActionBarIcons } from "@/components/analysis/shared/floating-action-bar/FloatingActionBarIcons"
import { DashboardProvidersComposition } from "@/components/providers/dashboard-providers-composition"
import { KeyboardShortcutsProvider } from "./keyboard-shortcuts-provider"
import { SidebarController } from "./sidebar-controller"
import { RealtimeDashboardBridge } from "./realtime-dashboard-bridge"
import { FloatingActionBarPanel, MobilePanelModal } from "./lazy-panels"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()
  if (!session) {
    redirect('/sign-in')
  }

  const swrFallback = {
    'current-user': {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
    },
  }
  const isAdmin = session.user.id === process.env.SUPERADMIN_USER_ID

  return (
    <DashboardProvidersComposition swrFallback={swrFallback}>
      <SidebarController />
      <RealtimeDashboardBridge />
      <AppSidebar isAdmin={isAdmin} />
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
