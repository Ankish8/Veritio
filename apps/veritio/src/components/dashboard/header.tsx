"use client"

import { SidebarTrigger } from '@/components/ui/sidebar'

interface HeaderProps {
  title?: string
  children?: React.ReactNode
  leftContent?: React.ReactNode
}

export function Header({ title, children, leftContent }: HeaderProps) {
  return (
    <header className="relative flex h-14 shrink-0 items-center gap-2 border-b border-border/50 px-4 bg-background/80 backdrop-blur-sm rounded-t-2xl sticky top-0 z-10">
      <SidebarTrigger className="sm:hidden" />
      {title && <h1 className="text-lg font-semibold text-foreground">{title}</h1>}
      {leftContent && <div className="min-w-0 flex items-center">{leftContent}</div>}
      <div className="flex-1" />
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  )
}
