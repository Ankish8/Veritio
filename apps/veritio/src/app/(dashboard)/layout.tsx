import "./dashboard.css";
import { redirect } from "next/navigation";
import { getServerSession } from "@veritio/auth/server";
import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { MobileDashboardNav } from "@/components/dashboard/mobile-dashboard-nav";
import { FloatingActionBarIcons } from "@/components/analysis/shared/floating-action-bar/FloatingActionBarIcons";
import { DashboardProvidersComposition } from "@/components/providers/dashboard-providers-composition";
import { KeyboardShortcutsProvider } from "./keyboard-shortcuts-provider";
import { SidebarController } from "./sidebar-controller";
import { RealtimeDashboardBridge } from "./realtime-dashboard-bridge";
import { FloatingActionBarPanel, MobilePanelModal } from "./lazy-panels";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) {
    redirect("/sign-in");
  }

  const swrFallback = {
    "current-user": {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
    },
  };
  const isAdmin = session.user.id === process.env.SUPERADMIN_USER_ID;

  return (
    <DashboardProvidersComposition swrFallback={swrFallback}>
      <SidebarController />
      <RealtimeDashboardBridge />
      <AppSidebar isAdmin={isAdmin} />
      <SidebarInset className="bg-app-background min-h-dvh overflow-x-hidden">
        <KeyboardShortcutsProvider>
          <div className="flex h-dvh flex-col overflow-hidden p-0 md:p-3">
            {/* Content card - right margin (44px) aligns with fixed icon bar */}
            <div className="flex min-w-0 flex-1 overflow-hidden rounded-none bg-background shadow-none md:mr-11 md:rounded-2xl md:shadow-lg dark:md:shadow-xl">
              <div className="flex min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-[env(safe-area-inset-bottom)]">
                {children}
              </div>
              <div className="hidden flex-shrink-0 overflow-hidden md:block md:max-w-[560px]">
                <FloatingActionBarPanel />
              </div>
            </div>
          </div>

          <MobileDashboardNav />
          <MobilePanelModal />

          {/* Fixed icon bar outside the content card */}
          <div className="pointer-events-auto fixed bottom-0 right-1 top-0 z-[100] hidden w-12 items-start justify-center pt-[18px] md:flex">
            <FloatingActionBarIcons />
          </div>
        </KeyboardShortcutsProvider>
      </SidebarInset>
    </DashboardProvidersComposition>
  );
}
