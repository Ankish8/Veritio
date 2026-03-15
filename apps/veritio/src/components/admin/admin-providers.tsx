'use client'

import type { ReactNode } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AuthProvider } from '@/components/providers/auth-provider'
import { AuthGuard } from '@/components/auth/auth-guard'
import { SWRProvider } from '@/components/providers/swr-provider'
import { DashboardThemeProvider } from '@/components/providers/dashboard-theme-provider'

interface AdminProvidersProps {
  children: ReactNode
}

export function AdminProviders({ children }: AdminProvidersProps) {
  return (
    <AuthProvider>
      <AuthGuard>
        <SWRProvider>
          <DashboardThemeProvider>
            <TooltipProvider>
              <SidebarProvider defaultOpen={true}>
                {children}
              </SidebarProvider>
            </TooltipProvider>
          </DashboardThemeProvider>
        </SWRProvider>
      </AuthGuard>
    </AuthProvider>
  )
}
