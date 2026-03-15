'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminCheck } from '@/hooks/use-admin-check'
import { Loader2 } from 'lucide-react'

interface AdminGuardProps {
  children: React.ReactNode
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { isAdmin, isLoading } = useAdminCheck()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace('/')
    }
  }, [isLoading, isAdmin, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <>{children}</>
}
