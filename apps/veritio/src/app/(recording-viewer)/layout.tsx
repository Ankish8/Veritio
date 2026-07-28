'use client'

import { AuthProvider } from '@/components/providers/auth-provider'
import { AuthGuard } from '@/components/auth/auth-guard'
import { SWRProvider } from '@/components/providers/swr-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { RouteProgressBar } from '@/components/providers/progress-bar'

export default function RecordingViewerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <Toaster />
      <RouteProgressBar />
      <AuthGuard>
        <SWRProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </SWRProvider>
      </AuthGuard>
    </AuthProvider>
  )
}
