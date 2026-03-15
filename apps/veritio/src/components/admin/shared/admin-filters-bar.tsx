'use client'

import type { ReactNode } from 'react'

interface AdminFiltersBarProps {
  children: ReactNode
}

export function AdminFiltersBar({ children }: AdminFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {children}
    </div>
  )
}
