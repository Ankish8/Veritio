"use client"

interface HeaderProps {
  title?: string
  children?: React.ReactNode
  leftContent?: React.ReactNode
}

export function Header({ title, children, leftContent }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/50 px-4 bg-background/80 backdrop-blur-sm rounded-t-2xl sticky top-0 z-10">
      {leftContent}
      {title && <h1 className="text-lg font-semibold text-foreground">{title}</h1>}
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </header>
  )
}
