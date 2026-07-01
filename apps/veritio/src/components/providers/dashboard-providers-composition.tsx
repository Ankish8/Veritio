'use client'

import type { ReactNode } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SidebarProvider } from "@/components/ui/sidebar"
import { FloatingActionBarProvider } from "@/components/analysis/shared/floating-action-bar/FloatingActionBarContext"
import { AuthGuard } from "@/components/auth/auth-guard"
import { SWRProvider } from "@/components/providers/swr-provider"
import { ErrorProvider } from "@/contexts/error-context"
import { DashboardThemeProvider } from "@/components/providers/dashboard-theme-provider"

interface DashboardProvidersCompositionProps {
  children: ReactNode
  swrFallback?: Record<string, unknown>
}

export function DashboardProvidersComposition({ children, swrFallback }: DashboardProvidersCompositionProps) {
  return (
    <SWRProvider fallback={swrFallback}>
      <AuthGuard>
        <DashboardThemeProvider>
          <ErrorProvider>
            <TooltipProvider>
              <FloatingActionBarProvider>
                <SidebarProvider defaultOpen={true}>
                  {children}
                </SidebarProvider>
              </FloatingActionBarProvider>
            </TooltipProvider>
          </ErrorProvider>
        </DashboardThemeProvider>
      </AuthGuard>
    </SWRProvider>
  )
}
