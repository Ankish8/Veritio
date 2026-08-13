"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";

interface HeaderProps {
  title?: string;
  children?: React.ReactNode;
  leftContent?: React.ReactNode;
}

export function Header({ title, children, leftContent }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-border/50 bg-background/90 px-3 py-2 backdrop-blur-sm md:h-14 md:flex-nowrap md:px-4 md:py-0 md:rounded-t-2xl">
      <SidebarTrigger className="h-11 w-11 shrink-0 md:hidden" />
      {leftContent && (
        <div className="flex min-w-0 flex-1 items-center md:flex-none md:shrink-0">
          {leftContent}
        </div>
      )}
      {title && (
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-foreground md:flex-none">
          {title}
        </h1>
      )}
      <div className="hidden flex-1 md:block" />
      {children && (
        // Sits on the same row as the title and hugs the right edge. It used to
        // be forced onto its own full-width row on mobile, which cost a whole
        // line of vertical space for what is usually two icon buttons. Wrapping
        // is still allowed, so genuinely wide actions drop to a second row
        // instead of squashing the title.
        <div className="ml-auto flex w-auto min-w-0 flex-wrap items-center justify-end gap-2">
          {children}
        </div>
      )}
    </header>
  );
}
