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
        <div className="flex min-w-0 shrink-0 items-center">{leftContent}</div>
      )}
      {title && (
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-foreground md:flex-none">
          {title}
        </h1>
      )}
      <div className="hidden flex-1 md:block" />
      {children && (
        <div className="order-3 flex w-full min-w-0 flex-wrap items-center gap-2 md:order-none md:w-auto">
          {children}
        </div>
      )}
    </header>
  );
}
