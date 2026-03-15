'use client'

import { AuthProvider } from '@/components/providers/auth-provider'
import { AuthGuard } from '@/components/auth/auth-guard'
import { SWRProvider } from '@/components/providers/swr-provider'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function RecordingViewerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
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
